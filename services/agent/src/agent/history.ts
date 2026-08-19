// ============================================================
// Action History Tracker
// ============================================================
// Maintains a rolling window of recent actions and detects
// repetitive patterns that indicate the agent is stuck.
// ============================================================

import type { ActionHistoryEntry, AgentAction } from '@conai/shared';

/**
 * Check if the agent appears to be stuck in a loop.
 * Returns a warning message if so, or null if not.
 */
export function detectStuckPattern(
  history: ActionHistoryEntry[],
  threshold: number = 3
): string | null {
  if (history.length < threshold) return null;

  const recent = history.slice(-threshold);

  // Check if the last N actions are all the same type and target
  const allSameType = recent.every(
    (e) => e.action.action === recent[0].action.action
  );

  if (!allSameType) return null;

  const actionType = recent[0].action.action;

  // For tap actions, check if they're tapping the same approximate area
  if (actionType === 'tap') {
    const taps = recent.map((e) => e.action as { action: 'tap'; x: number; y: number });
    const avgX = taps.reduce((s, t) => s + t.x, 0) / taps.length;
    const avgY = taps.reduce((s, t) => s + t.y, 0) / taps.length;

    const allClose = taps.every(
      (t) => Math.abs(t.x - avgX) < 50 && Math.abs(t.y - avgY) < 50
    );

    if (allClose) {
      return `Warning: You have tapped the same area (${Math.round(avgX)}, ${Math.round(avgY)}) ${threshold} times. The tap may not be working. Try a different approach — perhaps the element is not interactive, or you need to scroll to reveal the correct target.`;
    }
  }

  // For type actions, check if the same text is being typed
  if (actionType === 'type') {
    const texts = recent.map(
      (e) => (e.action as { action: 'type'; text: string }).text
    );
    const allSame = texts.every((t) => t === texts[0]);
    if (allSame) {
      return `Warning: You have typed "${texts[0]}" ${threshold} times. The text input may not be working. Check if an input field is focused, or try tapping the input field first.`;
    }
  }

  // Generic repetition warning
  return `Warning: You have performed "${actionType}" ${threshold} times in a row. Consider trying a different approach.`;
}

/**
 * Format an action for display in logs.
 */
export function formatAction(action: AgentAction): string {
  switch (action.action) {
    case 'tap':
      return `tap(${action.x}, ${action.y})`;
    case 'swipe':
      return `swipe(${action.x1},${action.y1} → ${action.x2},${action.y2})`;
    case 'type':
      return `type("${action.text}")`;
    case 'back':
      return 'back()';
    case 'home':
      return 'home()';
    case 'launch_app':
      return `launch_app(${action.package})`;
    case 'wait':
      return `wait(${action.duration_ms || 1500}ms)`;
    case 'finish':
      return `finish: ${action.reason || 'Task completed'}`;
    case 'fail':
      return `fail: ${action.reason}`;
  }
}
