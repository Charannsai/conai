// ============================================================
// Text-Only Agent (Accessibility Tree Mode)
// ============================================================
// Uses the Android UI tree (structured text) + a fast text-only
// LLM to decide actions. No screenshots or vision models needed.
// Coordinates are EXACT because they come from Android's own
// layout engine.
// ============================================================

import OpenAI from 'openai';
import type { AIActionResponse } from '@conai/shared';
import { AIActionResponseSchema } from '@conai/shared';
import { buildTextPrompt } from './prompts.js';

let textClient: OpenAI | null = null;

/**
 * Initialize the text-only Groq client.
 */
export function initTextClient(apiKey: string): void {
  textClient = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

function getTextClient(): OpenAI {
  if (!textClient) {
    throw new Error('Text client not initialized. Call initTextClient() first.');
  }
  return textClient;
}

/**
 * Analyze the UI tree (text-only) and decide what action to take.
 * This is MUCH faster than the vision-based approach because:
 * 1. No image upload — just text tokens
 * 2. Uses a fast text model (Llama 3.3 70B)
 * 3. Coordinates are exact (from Android's layout engine)
 */
export async function analyzeUITreeAndDecideAction(params: {
  uiTreeText: string;
  goal: string;
  currentApp: string;
  previousActions: Array<{ step: number; action: string; details: string }>;
  currentStep: number;
  maxSteps: number;
  model: string;
}): Promise<AIActionResponse> {
  const ai = getTextClient();

  const systemPrompt = buildTextPrompt({
    goal: params.goal,
    currentApp: params.currentApp,
    uiTreeText: params.uiTreeText,
    previousActions: params.previousActions,
    currentStep: params.currentStep,
    maxSteps: params.maxSteps,
  });

  // Retry logic for rate limiting
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.chat.completions.create({
        model: params.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Based on the UI elements listed above, what is the single best action to accomplish the goal: "${params.goal}"?`,
          },
        ],
        response_format: {
          type: 'json_object',
        } as any,
        temperature: 0.1,
        max_tokens: 512,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from text model');
      }

      let cleanContent = content;

      // Handle reasoning model artifacts
      if (cleanContent.includes('</think>')) {
        cleanContent = cleanContent.split('</think>').pop() || cleanContent;
      }

      cleanContent = cleanContent.trim();

      // Remove markdown formatting if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleanContent);
      const validated = AIActionResponseSchema.parse(parsed);
      return validated as AIActionResponse;
    } catch (error: any) {
      lastError = error;

      if (error?.status === 429) {
        const waitMs = Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `[TextAI] Rate limited. Retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/3)...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
