// ============================================================
// Action Validator
// ============================================================
// Safety layer that validates every action before execution.
// Rejects out-of-bounds coordinates, malformed inputs, and
// suspicious actions.
// ============================================================

import type { AIActionResponse } from '@conai/shared';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an AI action response before executing it.
 */
export function validateAction(
  action: AIActionResponse,
  screenWidth: number,
  screenHeight: number
): ValidationResult {
  // ---- Coordinate bounds for tap ----
  if (action.action === 'tap') {
    if (action.x == null || action.y == null) {
      return { valid: false, error: 'Tap action requires x and y coordinates' };
    }
    if (action.x < 0 || action.x > screenWidth) {
      return {
        valid: false,
        error: `Tap x=${action.x} out of bounds (0-${screenWidth})`,
      };
    }
    if (action.y < 0 || action.y > screenHeight) {
      return {
        valid: false,
        error: `Tap y=${action.y} out of bounds (0-${screenHeight})`,
      };
    }
  }

  // ---- Coordinate bounds for swipe ----
  if (action.action === 'swipe') {
    if (
      action.x1 == null ||
      action.y1 == null ||
      action.x2 == null ||
      action.y2 == null
    ) {
      return {
        valid: false,
        error: 'Swipe action requires x1, y1, x2, y2 coordinates',
      };
    }
    const coords = [
      { name: 'x1', val: action.x1, max: screenWidth },
      { name: 'y1', val: action.y1, max: screenHeight },
      { name: 'x2', val: action.x2, max: screenWidth },
      { name: 'y2', val: action.y2, max: screenHeight },
    ];
    for (const c of coords) {
      if (c.val < 0 || c.val > c.max) {
        return {
          valid: false,
          error: `Swipe ${c.name}=${c.val} out of bounds (0-${c.max})`,
        };
      }
    }

    // Duration sanity check
    if (action.duration_ms != null) {
      if (action.duration_ms < 50 || action.duration_ms > 10000) {
        return {
          valid: false,
          error: `Swipe duration ${action.duration_ms}ms out of range (50-10000)`,
        };
      }
    }
  }

  // ---- Text validation ----
  if (action.action === 'type') {
    if (!action.text) {
      return { valid: false, error: 'Type action requires text' };
    }
    if (action.text.length > 500) {
      return {
        valid: false,
        error: `Text too long (${action.text.length} chars, max 500)`,
      };
    }
  }

  // ---- Launch app validation ----
  if (action.action === 'launch_app') {
    if (!action.package) {
      return { valid: false, error: 'Launch app requires package name' };
    }
    // Basic package name format: com.example.app
    const packageRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
    if (!packageRegex.test(action.package)) {
      return {
        valid: false,
        error: `Invalid package name format: ${action.package}`,
      };
    }
  }

  // ---- Wait duration validation ----
  if (action.action === 'wait') {
    if (action.duration_ms != null) {
      if (action.duration_ms < 100 || action.duration_ms > 10000) {
        return {
          valid: false,
          error: `Wait duration ${action.duration_ms}ms out of range (100-10000)`,
        };
      }
    }
  }

  // ---- Fail requires reason ----
  if (action.action === 'fail') {
    if (!action.reason) {
      return { valid: false, error: 'Fail action requires a reason' };
    }
  }

  return { valid: true };
}
