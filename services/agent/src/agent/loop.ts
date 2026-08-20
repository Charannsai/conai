// ============================================================
// Hybrid Agent Loop
// ============================================================
// Uses two perception paths:
//   1. UI Tree (text) — for regular apps (fast, exact coords)
//   2. Vision AI (screenshot) — fallback for games/custom UIs
//
// The loop auto-detects which path to use based on the
// current foreground app.
// ============================================================

import { EventEmitter } from 'events';
import { AgentSession } from './state.js';
import type { DeviceInfo, AIActionResponse } from '@conai/shared';
import { captureScreenshotBase64 } from '../adb/screenshot.js';
import { analyzeScreenAndDecideAction } from '../ai/groq.js';
import { analyzeUITreeAndDecideAction } from '../ai/textAgent.js';
import { getUITree } from '../adb/uiTree.js';
import { isGameApp } from '../adb/gameDetector.js';
import { tap, swipe, typeText, pressBack, pressHome, pressEnter } from '../adb/input.js';
import { getCurrentApp, launchApp } from '../adb/app.js';
import { validateAction } from './validator.js';

export interface AgentLoopConfig {
  deviceId: string;
  device: DeviceInfo;
  goal: string;
  maxSteps: number;
  visionModel: string;
  textModel: string;
  stepDelayMs?: number;
  actionTimeoutMs?: number;
}

export class AgentLoop extends EventEmitter {
  private config: AgentLoopConfig;
  private session: AgentSession;
  private stopRequested: boolean = false;

  constructor(config: AgentLoopConfig) {
    super();
    this.config = config;
    this.session = new AgentSession(config.goal, config.maxSteps);

    this.session.on('status_change', (state) => this.emit('status_change', state));
    this.session.on('action_executed', (entry) => this.emit('action_executed', entry));
  }

  getState() {
    return this.session.state;
  }

  getHistory() {
    return this.session.history;
  }

  requestStop(): void {
    this.stopRequested = true;
    console.log('[Agent] Stop requested');
  }

  async run(): Promise<void> {
    console.log(`[Agent] Starting task: "${this.config.goal}"`);
    this.session.setStatus('running');

    while (!this.stopRequested && !this.session.isTerminated()) {
      try {
        // 1. Get current app context
        const currentApp = await getCurrentApp(this.config.deviceId);
        this.session.setCurrentApp(currentApp);

        // 2. Increment step
        const step = this.session.nextStep();

        // 3. Decide perception path
        let response: AIActionResponse;
        const gameDetected = await isGameApp(this.config.deviceId, currentApp);

        if (gameDetected) {
          // ---- VISION PATH (games/custom renderers) ----
          console.log(`[Agent] Step ${step}: Vision mode (game: ${currentApp})`);
          this.emit('agent_thinking', { thinking: 'Using Vision AI (game detected)...', step });

          const screenshot = await captureScreenshotBase64(this.config.deviceId);
          this.emit('screenshot_update', screenshot);

          response = await analyzeScreenAndDecideAction({
            screenshotBase64: screenshot,
            goal: this.config.goal,
            currentApp,
            previousActions: this.session.getRecentActionsSummary(),
            currentStep: step,
            maxSteps: this.config.maxSteps,
            model: this.config.visionModel,
          });
        } else {
          // ---- UI TREE PATH (regular apps) ----
          console.log(`[Agent] Step ${step}: UI Tree mode (app: ${currentApp})`);

          const { formattedText, hasInteractiveElements } = await getUITree(this.config.deviceId);

          if (hasInteractiveElements) {
            this.emit('agent_thinking', { thinking: 'Reading UI elements...', step });

            response = await analyzeUITreeAndDecideAction({
              uiTreeText: formattedText,
              goal: this.config.goal,
              currentApp,
              previousActions: this.session.getRecentActionsSummary(),
              currentStep: step,
              maxSteps: this.config.maxSteps,
              model: this.config.textModel,
            });
          } else {
            // UI tree is empty — fall back to vision
            console.log(`[Agent] Step ${step}: UI Tree empty, falling back to Vision`);
            this.emit('agent_thinking', { thinking: 'UI tree empty, using Vision AI fallback...', step });

            const screenshot = await captureScreenshotBase64(this.config.deviceId);
            this.emit('screenshot_update', screenshot);

            response = await analyzeScreenAndDecideAction({
              screenshotBase64: screenshot,
              goal: this.config.goal,
              currentApp,
              previousActions: this.session.getRecentActionsSummary(),
              currentStep: step,
              maxSteps: this.config.maxSteps,
              model: this.config.visionModel,
            });
          }
        }

        // 4. Log thinking
        console.log(`[Agent] Step ${step}: ${response.action} — ${response.thinking}`);
        this.emit('agent_thinking', { thinking: response.thinking, step });

        // 5. Validate action bounds
        const validation = validateAction(response, this.config.device.screenWidth, this.config.device.screenHeight);
        if (!validation.valid) {
          console.warn(`[Agent] Action validation failed: ${validation.error}`);
          this.session.addHistoryEntry({
            step,
            action: { action: 'fail', thinking: response.thinking, reason: validation.error },
            timestamp: Date.now(),
          });
          continue;
        }

        // 6. Execute action
        await this.executeAction(response);

        // 7. Record in history
        this.session.addHistoryEntry({
          step,
          action: response,
          timestamp: Date.now(),
        });

        // 8. Check terminal conditions
        if (response.action === 'finish') {
          this.session.setStatus('completed');
          break;
        } else if (response.action === 'fail') {
          this.session.setStatus('failed', response.reason);
          break;
        } else if (this.session.isOverStepLimit()) {
          this.session.setStatus('failed', 'Exceeded maximum steps');
          break;
        }

      } catch (e: any) {
        console.error('[Agent] Step failed:', e?.message || e);
        // Don't immediately fail — retry on transient errors
        if (e?.status === 400 || e?.status === 429) {
          console.warn('[Agent] Retrying after API error...');
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        this.session.setStatus('failed', `Error: ${e?.message}`);
        break;
      }

      // Delay before next step
      await new Promise(r => setTimeout(r, this.config.stepDelayMs || 1500));
    }

    if (this.stopRequested && !this.session.isTerminated()) {
      this.session.setStatus('stopped');
    }

    this.emit('task_complete', {
      state: this.session.state,
      history: this.session.history,
    });
  }

  private async executeAction(action: AIActionResponse): Promise<void> {
    const d = this.config.deviceId;
    switch (action.action) {
      case 'tap':
        if (action.x !== undefined && action.y !== undefined) {
          console.log(`[Agent] Tapping (${action.x}, ${action.y})`);
          await tap(d, action.x, action.y);
        }
        break;
      case 'swipe':
        if (action.x1 !== undefined && action.y1 !== undefined && action.x2 !== undefined && action.y2 !== undefined) {
          console.log(`[Agent] Swiping (${action.x1},${action.y1}) → (${action.x2},${action.y2})`);
          await swipe(d, action.x1, action.y1, action.x2, action.y2, action.duration_ms);
        }
        break;
      case 'type':
        if (action.text) {
          console.log(`[Agent] Typing: "${action.text}"`);
          await typeText(d, action.text);
        }
        break;
      case 'back':
        console.log('[Agent] Pressing Back');
        await pressBack(d);
        break;
      case 'home':
        console.log('[Agent] Pressing Home');
        await pressHome(d);
        break;
      case 'launch_app':
        if (action.package) {
          console.log(`[Agent] Launching: ${action.package}`);
          await launchApp(d, action.package);
        }
        break;
      case 'wait':
        const ms = action.duration_ms || 1500;
        console.log(`[Agent] Waiting ${ms}ms`);
        await new Promise(r => setTimeout(r, ms));
        break;
      case 'finish':
        console.log(`[Agent] ✅ Task completed: ${action.reason || 'Goal achieved'}`);
        break;
      case 'fail':
        console.log(`[Agent] ❌ Task failed: ${action.reason}`);
        break;
    }
  }
}
