// ============================================================
// WebSocket Server
// ============================================================
// Real-time communication bridge between the agent runtime
// and the Next.js web dashboard.
//
// Server → Client: screenshots, status, actions, thinking
// Client → Server: start_task, stop_agent, get_device_status
// ============================================================

import { WebSocketServer, WebSocket } from 'ws';
import type {
  ServerMessage,
  ClientMessage,
  DeviceInfo,
  AgentState,
  ActionHistoryEntry,
} from '@conai/shared';
import { ClientMessageSchema } from '@conai/shared';
import { AgentLoop, type AgentLoopConfig } from '../agent/loop.js';
import { getConnectedDevices, getDeviceInfo, resolveDevice } from '../adb/device.js';
import { captureScreenshotBase64 } from '../adb/screenshot.js';

export interface WebSocketServerConfig {
  port: number;
  configuredDeviceId: string;
  visionModel: string;
  maxSteps: number;
  stepDelayMs: number;
  actionTimeoutMs: number;
}

export class AgentWebSocketServer {
  private wss: WebSocketServer;
  private config: WebSocketServerConfig;
  private currentAgent: AgentLoop | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private clients: Set<WebSocket> = new Set();
  private isStreaming: boolean = false;
  private streamTimeout: NodeJS.Timeout | null = null;

  constructor(config: WebSocketServerConfig) {
    this.config = config;
    this.wss = new WebSocketServer({ port: config.port });
    this.setupServer();
  }

  private setupServer(): void {
    this.wss.on('connection', (ws) => {
      console.log('[WS] Client connected');
      this.clients.add(ws);

      // Send current device status on connect
      this.sendToClient(ws, {
        type: 'device_status',
        device: this.deviceInfo,
      });

      // If agent is running, send current state
      if (this.currentAgent) {
        this.sendToClient(ws, {
          type: 'status_change',
          state: this.currentAgent.getState(),
        });
      }

      ws.on('message', (data) => {
        this.handleMessage(ws, data.toString());
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[WS] Client error:', error);
        this.clients.delete(ws);
      });
    });

    console.log(`[WS] Server listening on port ${this.config.port}`);
  }

  /**
   * Handle incoming client messages.
   */
  private async handleMessage(ws: WebSocket, raw: string): Promise<void> {
    let message: ClientMessage;
    try {
      const parsed = JSON.parse(raw);
      message = ClientMessageSchema.parse(parsed);
    } catch (error: any) {
      this.sendToClient(ws, {
        type: 'error',
        message: `Invalid message: ${error?.message}`,
        fatal: false,
      });
      return;
    }

    switch (message.type) {
      case 'start_task':
        await this.handleStartTask(message.goal);
        break;

      case 'stop_agent':
        this.handleStopAgent();
        break;

      case 'get_device_status':
        await this.handleGetDeviceStatus();
        break;

      case 'start_stream':
        this.handleStartStream();
        break;

      case 'stop_stream':
        this.handleStopStream();
        break;
    }
  }

  /**
   * Start a new agent task.
   */
  private async handleStartTask(goal: string): Promise<void> {
    if (this.currentAgent) {
      this.broadcast({
        type: 'error',
        message: 'Agent is already running. Stop it first.',
        fatal: false,
      });
      return;
    }

    // Resolve device
    const deviceId = await resolveDevice(this.config.configuredDeviceId);
    if (!deviceId) {
      this.broadcast({
        type: 'error',
        message: 'No Android device connected. Please connect a device via USB with debugging enabled.',
        fatal: true,
      });
      return;
    }

    // Get device info
    try {
      this.deviceInfo = await getDeviceInfo(deviceId);
      this.broadcast({ type: 'device_status', device: this.deviceInfo });
    } catch (error: any) {
      this.broadcast({
        type: 'error',
        message: `Failed to get device info: ${error?.message}`,
        fatal: true,
      });
      return;
    }

    console.log(`[WS] Starting task: "${goal}" on device ${deviceId}`);

    // Create agent loop
    const agentConfig: AgentLoopConfig = {
      deviceId,
      device: this.deviceInfo,
      goal,
      maxSteps: this.config.maxSteps,
      stepDelayMs: this.config.stepDelayMs,
      actionTimeoutMs: this.config.actionTimeoutMs,
      visionModel: this.config.visionModel,
    };

    this.currentAgent = new AgentLoop(agentConfig);

    // Wire up agent events to WebSocket broadcasts
    this.currentAgent.on('screenshot_update', (base64: string) => {
      this.broadcast({
        type: 'screenshot_update',
        screenshotBase64: base64,
        timestamp: Date.now(),
      });
    });

    this.currentAgent.on('agent_thinking', (data: { thinking: string; step: number }) => {
      this.broadcast({
        type: 'agent_thinking',
        thinking: data.thinking,
        step: data.step,
      });
    });

    this.currentAgent.on('action_executed', (entry: ActionHistoryEntry) => {
      this.broadcast({
        type: 'action_executed',
        entry,
      });
    });

    this.currentAgent.on('status_change', (state: AgentState) => {
      this.broadcast({
        type: 'status_change',
        state,
      });
    });

    this.currentAgent.on('task_complete', (data: { state: AgentState; history: ActionHistoryEntry[] }) => {
      this.broadcast({
        type: 'task_complete',
        state: data.state,
        history: data.history,
      });
      this.currentAgent = null;
    });

    // Run the agent (non-blocking)
    this.currentAgent.run().catch((error) => {
      console.error('[WS] Agent run error:', error);
      this.broadcast({
        type: 'error',
        message: `Agent crashed: ${error?.message}`,
        fatal: true,
      });
      this.currentAgent = null;
    });
  }

  /**
   * Stop the currently running agent.
   */
  private handleStopAgent(): void {
    if (!this.currentAgent) {
      this.broadcast({
        type: 'error',
        message: 'No agent is currently running.',
        fatal: false,
      });
      return;
    }

    console.log('[WS] Stopping agent...');
    this.currentAgent.requestStop();
  }

  /**
   * Refresh and broadcast device status.
   */
  private async handleGetDeviceStatus(): Promise<void> {
    try {
      const deviceId = await resolveDevice(this.config.configuredDeviceId);
      if (deviceId) {
        this.deviceInfo = await getDeviceInfo(deviceId);

        // Also capture a fresh screenshot
        try {
          const screenshot = await captureScreenshotBase64(deviceId);
          this.broadcast({
            type: 'screenshot_update',
            screenshotBase64: screenshot,
            timestamp: Date.now(),
          });
        } catch {
          // Screenshot might fail — that's okay for status check
        }
      } else {
        this.deviceInfo = null;
      }

      this.broadcast({ type: 'device_status', device: this.deviceInfo });
    } catch (error: any) {
      this.deviceInfo = null;
      this.broadcast({ type: 'device_status', device: null });
    }
  }

  /**
   * Start live streaming screenshots.
   */
  private handleStartStream(): void {
    if (this.isStreaming) return;
    this.isStreaming = true;
    console.log('[WS] Live stream started');
    this.streamLoop();
  }

  /**
   * Stop live streaming.
   */
  private handleStopStream(): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;
    if (this.streamTimeout) {
      clearTimeout(this.streamTimeout);
      this.streamTimeout = null;
    }
    console.log('[WS] Live stream stopped');
  }

  /**
   * Background loop for streaming screenshots.
   */
  private async streamLoop(): Promise<void> {
    if (!this.isStreaming) return;

    try {
      // If agent is actively running, it captures its own screenshots in its loop.
      // We'll still allow the stream to run, but we can capture independently.
      // However, concurrent ADB screencap commands can be slow, so ideally we shouldn't stream
      // if the agent is heavily active, but we'll try to just take screenshots at a steady interval.
      const deviceId = await resolveDevice(this.config.configuredDeviceId);
      if (deviceId) {
        const screenshot = await captureScreenshotBase64(deviceId);
        if (this.isStreaming) {
          this.broadcast({
            type: 'screenshot_update',
            screenshotBase64: screenshot,
            timestamp: Date.now(),
          });
        }
      }
    } catch (e) {
      // Ignore errors during stream (e.g. adb busy)
    }

    if (this.isStreaming) {
      this.streamTimeout = setTimeout(() => this.streamLoop(), 1000); // 1 frame per second
    }
  }

  /**
   * Send a message to a specific client.
   */
  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast a message to all connected clients.
   */
  private broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * Gracefully close the server.
   */
  close(): void {
    if (this.currentAgent) {
      this.currentAgent.requestStop();
    }
    this.handleStopStream();
    this.wss.close();
  }
}
