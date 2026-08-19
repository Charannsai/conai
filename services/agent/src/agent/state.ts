// ============================================================
// Agent State Management
// ============================================================
// Manages the lifecycle of an agent session — tracks goal,
// status, step count, and emits state change events.
// ============================================================

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { AgentState, AgentStatus, ActionHistoryEntry } from '@conai/shared';

export class AgentSession extends EventEmitter {
  public state: AgentState;
  public history: ActionHistoryEntry[] = [];

  constructor(goal: string, maxSteps: number) {
    super();
    this.state = {
      taskId: randomUUID(),
      goal,
      status: 'idle',
      currentStep: 0,
      maxSteps,
      currentApp: 'unknown',
      startedAt: null,
      completedAt: null,
      error: null,
    };
  }

  /**
   * Transition to a new status.
   */
  setStatus(status: AgentStatus, error?: string): void {
    this.state.status = status;

    if (status === 'running' && !this.state.startedAt) {
      this.state.startedAt = Date.now();
    }

    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'stopped'
    ) {
      this.state.completedAt = Date.now();
    }

    if (error) {
      this.state.error = error;
    }

    this.emit('status_change', { ...this.state });
  }

  /**
   * Increment step counter and return the new step number.
   */
  nextStep(): number {
    this.state.currentStep += 1;
    return this.state.currentStep;
  }

  /**
   * Update the current foreground app.
   */
  setCurrentApp(app: string): void {
    this.state.currentApp = app;
  }

  /**
   * Record an action in history.
   */
  addHistoryEntry(entry: ActionHistoryEntry): void {
    this.history.push(entry);
    this.emit('action_executed', entry);
  }

  /**
   * Check if the agent has exceeded the max step limit.
   */
  isOverStepLimit(): boolean {
    return this.state.currentStep >= this.state.maxSteps;
  }

  /**
   * Check if the agent is in a terminal state.
   */
  isTerminated(): boolean {
    return (
      this.state.status === 'completed' ||
      this.state.status === 'failed' ||
      this.state.status === 'stopped'
    );
  }

  /**
   * Get the last N actions as a summary for the AI prompt.
   */
  getRecentActionsSummary(n: number = 10): Array<{
    step: number;
    action: string;
    details: string;
  }> {
    return this.history.slice(-n).map((entry) => {
      const action = entry.action;
      let details = '';

      switch (action.action) {
        case 'tap':
          details = `(${action.x}, ${action.y})`;
          break;
        case 'swipe':
          details = `(${action.x1},${action.y1}) → (${action.x2},${action.y2})`;
          break;
        case 'type':
          details = `"${action.text}"`;
          break;
        case 'launch_app':
          details = action.package;
          break;
        case 'wait':
          details = `${action.duration_ms || 1500}ms`;
          break;
        case 'finish':
        case 'fail':
          details = action.reason || '';
          break;
        default:
          details = '';
      }

      return {
        step: entry.step,
        action: action.action,
        details,
      };
    });
  }
}
