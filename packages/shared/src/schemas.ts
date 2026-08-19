// ============================================================
// AI Mobile Operator — Zod Schemas
// ============================================================
// Runtime validation schemas that mirror the TypeScript types.
// Used for:
//   1. Validating AI structured output
//   2. Runtime type checking of WebSocket messages
//   3. Generating JSON Schema for Groq response_format
// ============================================================

import { z } from 'zod';

// ----------------------------------------------------------
// Action Types
// ----------------------------------------------------------

export const ActionTypeSchema = z.enum([
  'tap',
  'swipe',
  'type',
  'back',
  'home',
  'launch_app',
  'wait',
  'finish',
  'fail',
]);

// ----------------------------------------------------------
// AI Action Response Schema
// This is the JSON Schema sent to Groq for structured output
// ----------------------------------------------------------

export const AIActionResponseSchema = z.object({
  thinking: z.string().describe(
    'Brief reasoning about what you see on screen and why you chose this action'
  ),
  action: ActionTypeSchema.describe('The action to perform'),
  x: z.number().int().optional().describe('X coordinate for tap action'),
  y: z.number().int().optional().describe('Y coordinate for tap action'),
  x1: z.number().int().optional().describe('Start X for swipe'),
  y1: z.number().int().optional().describe('Start Y for swipe'),
  x2: z.number().int().optional().describe('End X for swipe'),
  y2: z.number().int().optional().describe('End Y for swipe'),
  duration_ms: z
    .number()
    .int()
    .optional()
    .describe('Duration in milliseconds for swipe or wait'),
  text: z.string().optional().describe('Text to type'),
  package: z.string().optional().describe('App package name for launch_app'),
  reason: z
    .string()
    .optional()
    .describe('Human-readable reason for the action (debugging)'),
});

// ----------------------------------------------------------
// JSON Schema for Groq response_format
// ----------------------------------------------------------

export function getActionJsonSchema() {
  return {
    name: 'agent_action',
    strict: true,
    schema: {
      type: 'object' as const,
      properties: {
        thinking: {
          type: 'string',
          description:
            'Brief reasoning about what you see on screen and why you chose this action',
        },
        action: {
          type: 'string',
          enum: [
            'tap',
            'swipe',
            'type',
            'back',
            'home',
            'launch_app',
            'wait',
            'finish',
            'fail',
          ],
          description: 'The action to perform',
        },
        x: {
          type: ['integer', 'null'] as const,
          description: 'X coordinate for tap action',
        },
        y: {
          type: ['integer', 'null'] as const,
          description: 'Y coordinate for tap action',
        },
        x1: {
          type: ['integer', 'null'] as const,
          description: 'Start X for swipe',
        },
        y1: {
          type: ['integer', 'null'] as const,
          description: 'Start Y for swipe',
        },
        x2: {
          type: ['integer', 'null'] as const,
          description: 'End X for swipe',
        },
        y2: {
          type: ['integer', 'null'] as const,
          description: 'End Y for swipe',
        },
        duration_ms: {
          type: ['integer', 'null'] as const,
          description: 'Duration in milliseconds for swipe or wait',
        },
        text: {
          type: ['string', 'null'] as const,
          description: 'Text to type',
        },
        package: {
          type: ['string', 'null'] as const,
          description: 'App package name for launch_app',
        },
        reason: {
          type: ['string', 'null'] as const,
          description: 'Human-readable reason for the action (debugging)',
        },
      },
      required: [
        'thinking',
        'action',
        'x',
        'y',
        'x1',
        'y1',
        'x2',
        'y2',
        'duration_ms',
        'text',
        'package',
        'reason',
      ],
      additionalProperties: false,
    },
  };
}

// ----------------------------------------------------------
// Client → Server message schemas
// ----------------------------------------------------------

export const StartTaskSchema = z.object({
  type: z.literal('start_task'),
  goal: z.string().min(1, 'Task goal cannot be empty'),
});

export const StopAgentSchema = z.object({
  type: z.literal('stop_agent'),
});

export const GetDeviceStatusSchema = z.object({
  type: z.literal('get_device_status'),
});

export const StartStreamSchema = z.object({
  type: z.literal('start_stream'),
});

export const StopStreamSchema = z.object({
  type: z.literal('stop_stream'),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  StartTaskSchema,
  StopAgentSchema,
  GetDeviceStatusSchema,
  StartStreamSchema,
  StopStreamSchema,
]);
