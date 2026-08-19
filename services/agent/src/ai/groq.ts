// ============================================================
// Groq AI Client
// ============================================================
// Uses the OpenAI Node.js SDK pointed at Groq's API to send
// screenshots and context to the vision model and receive
// structured action responses.
// ============================================================

import OpenAI from 'openai';
import type { AIActionResponse } from '@conai/shared';
import { AIActionResponseSchema, getActionJsonSchema } from '@conai/shared';
import { buildPrompt } from './prompts.js';

let client: OpenAI | null = null;

/**
 * Initialize the Groq client.
 * Uses the OpenAI SDK with Groq's base URL.
 */
export function initGroqClient(apiKey: string): void {
  client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

function getClient(): OpenAI {
  if (!client) {
    throw new Error(
      'Groq client not initialized. Call initGroqClient() first.'
    );
  }
  return client;
}

/**
 * Send a screenshot and context to the Groq vision model
 * and receive a structured action decision.
 */
export async function analyzeScreenAndDecideAction(params: {
  screenshotBase64: string;
  goal: string;
  currentApp: string;
  previousActions: Array<{ step: number; action: string; details: string }>;
  currentStep: number;
  maxSteps: number;
  model: string;
}): Promise<AIActionResponse> {
  const ai = getClient();

  const systemPrompt = buildPrompt({
    goal: params.goal,
    currentApp: params.currentApp,
    previousActions: params.previousActions,
    currentStep: params.currentStep,
    maxSteps: params.maxSteps,
  });

  const actionSchema = getActionJsonSchema();

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
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${params.screenshotBase64}`,
                },
              },
              {
                type: 'text',
                text: `Current screen is shown above. What action should be performed next to accomplish the goal: "${params.goal}"?`,
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: actionSchema,
        } as any,
        temperature: 0.1,
        max_tokens: 1024,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      const parsed = JSON.parse(content);
      const validated = AIActionResponseSchema.parse(parsed);
      return validated as AIActionResponse;
    } catch (error: any) {
      lastError = error;

      // Rate limit — wait and retry
      if (error?.status === 429) {
        const waitMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.warn(
          `[AI] Rate limited. Retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/3)...`
        );
        await sleep(waitMs);
        continue;
      }

      // Non-retryable error
      throw error;
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
