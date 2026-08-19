// ============================================================
// AI Schemas (re-export)
// ============================================================
// Re-exports from the shared package for convenience.
// The JSON schema generation lives in @conai/shared so both
// the agent and web packages can reference the same types.
// ============================================================

export { AIActionResponseSchema, getActionJsonSchema } from '@conai/shared';
