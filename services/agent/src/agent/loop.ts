// ============================================================
// Agent Loop — The Core Algorithm
// ============================================================
// Implements: Observe → Reason → Act → Verify → Repeat
//
// This is the actual "agent". The LLM by itself is NOT the
// agent. The agent is:
//   Model + State + Tools + Memory + Control Loop + Verification
// ============================================================

import { EventEmitter } from 'events';
import { captureScreenshotBase64 } from '../adb/screenshot.js';
import { tap, swipe, typeText, pressBack, pressHome, pressEnter } from '../adb/input.js';
import { launchApp, getCurrentApp } from '../adb/app.js';
import { analyzeScreenAndDecideAction } from '../ai/groq.js';
import { validateAction } from './validator.js';
import { detectStuckPattern, formatAction } from './history.js';
import { AgentSession } from './state.js';
import type {
  AgentAction,
  AIActionResponse,
  ActionHistoryEntry,
  DeviceInfo,
} from '@conai/shared';

export interface AgentLoopConfig {
  deviceId: string;
  device: DeviceInfo;
  goal: string;
  maxSteps: number;
  stepDelayMs: number;
  actionTimeoutMs: number;
  visionModel: string;
}

/**
 * The AgentLoop orchestrates the entire observe→reason→act cycle.
 * It emits events that the WebSocket server forwards to the dashboard.
 */
export class AgentLoop extends EventEmitter {
  private config: AgentLoopConfig;
  private session: AgentSession;
  private stopRequested: boolean = false;

  constructor(config: AgentLoopConfig) {
    super();
    this.config = config;
    this.session = new AgentSession(config.goal, config.maxSteps);

    // Forward session events
    this.session.on('status_change', (state) => {
      this.emit('status_change', state);
    });
    this.session.on('action_executed', (entry: ActionHistoryEntry) => {
      this.emit('action_executed', entry);
    });
  }

  /**
   * Get the current session state.
   */
  getState() {
    return this.session.state;
  }

  /**
   * Get action history.
   */
  getHistory() {
    return this.session.history;
  }

  /**
   * Request the agent to stop after the current step.
   */
  requestStop(): void {
    this.stopRequested = true;
    console.log('[Agent] Stop requested');
  }

  /**
   * Run the agent loop until completion, failure, or stop.
   */
  async run(): Promise<void> {
    console.log(`[Agent] Starting task: "${this.config.goal}"`);
    this.session.setStatus('running');

    try {
      while (!this.session.isTerminated() && !this.stopRequested) {
        // ---- Check step limit ----
        if (this.session.isOverStepLimit()) {
          console.log('[Agent] Maximum steps reached');
          this.session.setStatus(
            'failed',
            `Maximum steps (${this.config.maxSteps}) reached without completing the task`
          );
          break;
        }

        const step = this.session.nextStep();
        console.log(
          `\n[Agent] === Step ${step}/${this.config.maxSteps} ===`
        );

        // ---- 1. OBSERVE — Capture screenshot ----
        this.session.setStatus('thinking');
        console.log('[Agent] Capturing screenshot...');

        let screenshotBase64: string;
        try {
          screenshotBase64 = await captureScreenshotBase64(
            this.config.deviceId
          );
          this.emit('screenshot_update', screenshotBase64);
        } catch (error) {
          console.error('[Agent] Failed to capture screenshot:', error);
          this.session.setStatus('failed', 'Failed to capture screenshot');
          break;
        }

        // ---- Get current foreground app ----
        const currentApp = await getCurrentApp(this.config.deviceId);
        this.session.setCurrentApp(currentApp);

        // ---- Check for stuck pattern ----
        const stuckWarning = detectStuckPattern(this.session.history);

        // ---- 2. REASON — Send to AI ----
        console.log('[Agent] Sending to AI for analysis...');
        this.emit('agent_thinking', {
          thinking: 'Analyzing screen...',
          step,
        });

        let aiResponse: AIActionResponse;
        try {
          const previousActions = this.session.getRecentActionsSummary();

          // If stuck, append warning to the goal context
          const goalWithWarning = stuckWarning
            ? `${this.config.goal}\n\n⚠️ ${stuckWarning}`
            : this.config.goal;

          aiResponse = await analyzeScreenAndDecideAction({
            screenshotBase64,
            goal: goalWithWarning,
            currentApp,
            previousActions,
            currentStep: step,
            maxSteps: this.config.maxSteps,
            model: this.config.visionModel,
          });

          console.log(
            `[Agent] AI decided: ${aiResponse.action} — ${aiResponse.thinking}`
          );
          this.emit('agent_thinking', {
            thinking: aiResponse.thinking,
            step,
          });
        } catch (error: any) {
          console.error('[Agent] AI analysis failed:', error?.message);
          this.session.setStatus('failed', `AI error: ${error?.message}`);
          break;
        }

        // ---- 3. VALIDATE — Check action safety ----
        const validation = validateAction(
          aiResponse,
          this.config.device.screenWidth,
          this.config.device.screenHeight
        );

        if (!validation.valid) {
          console.warn(`[Agent] Invalid action rejected: ${validation.error}`);
          // Record as failed action but continue the loop
          this.session.addHistoryEntry({
            step,
            action: aiResponseToAction(aiResponse),
            timestamp: Date.now(),
            success: false,
            thinking: `REJECTED: ${validation.error}`,
          });
          continue;
        }

        // ---- 4. EXECUTE — Perform the action ----
        const action = aiResponseToAction(aiResponse);
        console.log(`[Agent] Executing: ${formatAction(action)}`);
        this.session.setStatus('acting');

        // Check for terminal actions first
        if (action.action === 'finish') {
          this.session.addHistoryEntry({
            step,
            action,
            timestamp: Date.now(),
            success: true,
            thinking: aiResponse.thinking,
          });
          this.session.setStatus('completed');
          console.log('[Agent] ✅ Task completed!');
          break;
        }

        if (action.action === 'fail') {
          this.session.addHistoryEntry({
            step,
            action,
            timestamp: Date.now(),
            success: true,
            thinking: aiResponse.thinking,
          });
          this.session.setStatus('failed', action.reason);
          console.log(`[Agent] ❌ Task failed: ${action.reason}`);
          break;
        }

        try {
          await executeAction(this.config.deviceId, action);
          this.session.addHistoryEntry({
            step,
            action,
            timestamp: Date.now(),
            success: true,
            thinking: aiResponse.thinking,
          });
        } catch (error: any) {
          console.error('[Agent] Action execution failed:', error?.message);
          this.session.addHistoryEntry({
            step,
            action,
            timestamp: Date.now(),
            success: false,
            thinking: `Execution failed: ${error?.message}`,
          });
          // Don't stop on a single execution failure — let the AI adapt
        }

        // ---- 5. WAIT — Let the UI settle ----
        if (!this.stopRequested) {
          const delay =
            action.action === 'wait'
              ? (action.duration_ms || 1500)
              : this.config.stepDelayMs;
          await sleep(delay);
        }
      }

      // Handle stop request
      if (this.stopRequested && !this.session.isTerminated()) {
        this.session.setStatus('stopped');
        console.log('[Agent] ⏹ Stopped by user');
      }
    } catch (error: any) {
      console.error('[Agent] Unexpected error:', error);
      this.session.setStatus('failed', `Unexpected error: ${error?.message}`);
    }

    // Emit final state
    this.emit('task_complete', {
      state: this.session.state,
      history: this.session.history,
    });
  }
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

/**
 * Convert raw AI response to a typed AgentAction.
 */
function aiResponseToAction(response: AIActionResponse): AgentAction {
  switch (response.action) {
    case 'tap':
      return { action: 'tap', x: response.x!, y: response.y!, reason: response.reason };
    case 'swipe':
      return {
        action: 'swipe',
        x1: response.x1!,
        y1: response.y1!,
        x2: response.x2!,
        y2: response.y2!,
        duration_ms: response.duration_ms,
        reason: response.reason,
      };
    case 'type':
      return { action: 'type', text: response.text!, reason: response.reason };
    case 'back':
      return { action: 'back', reason: response.reason };
    case 'home':
      return { action: 'home', reason: response.reason };
    case 'launch_app':
      return { action: 'launch_app', package: response.package!, reason: response.reason };
    case 'wait':
      return { action: 'wait', duration_ms: response.duration_ms, reason: response.reason };
    case 'finish':
      return { action: 'finish', reason: response.reason };
    case 'fail':
      return { action: 'fail', reason: response.reason || 'Unknown failure' };
  }
}

/**
 * Execute an action on the device via ADB.
 */
async function executeAction(
  deviceId: string,
  action: AgentAction
): Promise<void> {
  switch (action.action) {
    case 'tap':
      await tap(deviceId, action.x, action.y);
      break;
    case 'swipe':
      await swipe(
        deviceId,
        action.x1,
        action.y1,
        action.x2,
        action.y2,
        action.duration_ms
      );
      break;
    case 'type':
      await typeText(deviceId, action.text);
      // Auto-press enter after typing (common pattern for search)
      break;
    case 'back':
      await pressBack(deviceId);
      break;
    case 'home':
      await pressHome(deviceId);
      break;
    case 'launch_app':
      await launchApp(deviceId, action.package);
      break;
    case 'wait':
      // Wait is handled in the main loop
      break;
    case 'finish':
    case 'fail':
      // Terminal actions — no ADB command needed
      break;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
