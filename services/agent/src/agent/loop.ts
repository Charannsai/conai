import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { AgentSession } from './state.js';
import { StrategicAgent } from '../core/ai/StrategicAgent.js';
import type { DeviceInfo } from '@conai/shared';
import { captureScreenshotBase64 } from '../adb/screenshot.js';

export interface AgentLoopConfig {
  deviceId: string;
  device: DeviceInfo;
  goal: string;
  maxSteps: number;
  visionModel: string;
}

export class AgentLoop extends EventEmitter {
  private config: AgentLoopConfig;
  private session: AgentSession;
  private strategicAgent: StrategicAgent;
  private stopRequested: boolean = false;
  private ws: WebSocket | null = null;
  private strategyInterval: NodeJS.Timeout | null = null;

  constructor(config: AgentLoopConfig) {
    super();
    this.config = config;
    this.session = new AgentSession(config.goal, config.maxSteps);
    this.strategicAgent = new StrategicAgent(this.session, config.visionModel);

    this.session.on('status_change', (state) => this.emit('status_change', state));
    this.strategicAgent.on('thinking', (msg) => this.emit('agent_thinking', { thinking: msg, step: this.session.state.currentStep }));
    this.strategicAgent.on('strategy_changed', (strategy) => this.emit('strategy_changed', strategy));
  }

  getState() {
    return this.session.state;
  }

  getHistory() {
    return this.session.history;
  }

  requestStop(): void {
    this.stopRequested = true;
    if (this.ws) {
      this.ws.close();
    }
    if (this.strategyInterval) {
      clearInterval(this.strategyInterval);
    }
    console.log('[Agent] Stop requested');
  }

  async run(): Promise<void> {
    console.log(`[Agent] Starting V2 task: "${this.config.goal}"`);
    this.session.setStatus('running');

    // Connect to Python Vision Server
    this.ws = new WebSocket('ws://127.0.0.1:8000/ws/strategy');

    this.ws.on('open', () => {
      console.log('[Agent] Connected to Python Vision Server');
      // Initialize strategy evaluation loop (e.g. every 5 seconds)
      this.strategyInterval = setInterval(() => {
        if (this.stopRequested) return;
        // Ping for game state
        this.ws?.send(JSON.stringify({ action: 'get_state' }));
      }, 5000);
    });

    this.ws.on('message', async (data) => {
      if (this.stopRequested) return;
      try {
        const payload = JSON.parse(data.toString());
        if (payload.state) {
          // Received Game State from Python
          const gameState = payload.state;
          this.emit('game_state', gameState);

          // Capture actual screenshot for the Vision AI
          let screenshot = "";
          try {
            screenshot = await captureScreenshotBase64(this.config.deviceId);
          } catch (e) {
            console.error('[Agent] Failed to capture screenshot for vision', e);
          }

          // Evaluate strategy
          const newStrategy = await this.strategicAgent.evaluateGameState(gameState, screenshot);
          if (newStrategy) {
            // Push new strategy to Python Tactical Controller
            this.ws?.send(JSON.stringify({ strategy: newStrategy }));
          }
        }
      } catch (e) {
        console.error('[Agent] Failed to parse message from Vision Server', e);
      }
    });

    this.ws.on('close', () => {
      console.log('[Agent] Disconnected from Python Vision Server');
      if (!this.stopRequested) {
        this.session.setStatus('failed', 'Lost connection to Vision Server');
      }
    });

    this.ws.on('error', (err) => {
      console.error('[Agent] WebSocket error:', err);
      this.session.setStatus('failed', 'WebSocket error with Vision Server');
    });

    // Wait until stop is requested or failed
    while (!this.stopRequested && !this.session.isTerminated()) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.stopRequested && !this.session.isTerminated()) {
      this.session.setStatus('stopped');
    }

    this.emit('task_complete', {
      state: this.session.state,
      history: this.session.history,
    });
  }
}
