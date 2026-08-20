import { EventEmitter } from 'events';
import { AgentSession } from './state.js';
import type { DeviceInfo, AIActionResponse } from '@conai/shared';
import { captureScreenshotBase64 } from '../adb/screenshot.js';
import { analyzeScreenAndDecideAction } from '../ai/groq.js';
import { tap, swipe, typeText, pressBack, pressHome, pressEnter } from '../adb/input.js';
import { getCurrentApp, launchApp } from '../adb/app.js';
import { validateAction } from './validator.js';

export interface AgentLoopConfig {
  deviceId: string;
  device: DeviceInfo;
  goal: string;
  maxSteps: number;
  visionModel: string;
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
        // 1. Capture screen
        const screenshot = await captureScreenshotBase64(this.config.deviceId);
        this.emit('screenshot_update', screenshot);

        // 2. Get current app context
        const currentApp = await getCurrentApp(this.config.deviceId);
        this.session.setCurrentApp(currentApp);

        // 3. Increment step
        const step = this.session.nextStep();

        // 4. Think & Decide Action
        const response = await analyzeScreenAndDecideAction({
          screenshotBase64: screenshot,
          goal: this.config.goal,
          currentApp,
          previousActions: this.session.getRecentActionsSummary(),
          currentStep: step,
          maxSteps: this.config.maxSteps,
          model: this.config.visionModel,
        });

        this.emit('agent_thinking', { thinking: response.thinking, step });

        // Validate action bounds
        const validation = validateAction(response, this.config.device.screenWidth, this.config.device.screenHeight);
        if (!validation.valid) {
          console.warn(`[Agent] Action validation failed: ${validation.error}`);
          // We record it as a fail step and continue to let the AI try again next tick
          this.session.addHistoryEntry({
            step,
            action: { action: 'fail', thinking: response.thinking, reason: validation.error },
            timestamp: Date.now(),
          });
          continue;
        }

        // 5. Execute Action
        await this.executeAction(response);

        // 6. Record in history
        this.session.addHistoryEntry({
          step,
          action: response,
          timestamp: Date.now(),
        });

        // 7. Check terminal conditions
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
        console.error('[Agent] Step failed:', e);
        this.session.setStatus('failed', `Error: ${e.message}`);
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
          await tap(d, action.x, action.y);
        }
        break;
      case 'swipe':
        if (action.x1 !== undefined && action.y1 !== undefined && action.x2 !== undefined && action.y2 !== undefined) {
          await swipe(d, action.x1, action.y1, action.x2, action.y2, action.duration_ms);
        }
        break;
      case 'type':
        if (action.text) {
          await typeText(d, action.text);
          await pressEnter(d);
        }
        break;
      case 'back':
        await pressBack(d);
        break;
      case 'home':
        await pressHome(d);
        break;
      case 'launch_app':
        if (action.package) {
          await launchApp(d, action.package);
        }
        break;
      case 'wait':
        const ms = action.duration_ms || 1500;
        await new Promise(r => setTimeout(r, ms));
        break;
      case 'finish':
      case 'fail':
        // Handled in main loop
        break;
    }
  }
}
