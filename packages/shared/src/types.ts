// ============================================================
// AI Mobile Operator — Shared Types
// ============================================================
// Core TypeScript interfaces used by both the web dashboard
// and the agent runtime.
// ============================================================

// ----------------------------------------------------------
// Device
// ----------------------------------------------------------

export interface DeviceInfo {
  id: string;
  model: string;
  androidVersion: string;
  screenWidth: number;
  screenHeight: number;
  connected: boolean;
}

// ----------------------------------------------------------
// Agent Actions (discriminated union)
// ----------------------------------------------------------

export interface TapAction {
  action: 'tap';
  x: number;
  y: number;
  reason?: string;
}

export interface SwipeAction {
  action: 'swipe';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  duration_ms?: number;
  reason?: string;
}

export interface TypeAction {
  action: 'type';
  text: string;
  reason?: string;
}

export interface BackAction {
  action: 'back';
  reason?: string;
}

export interface HomeAction {
  action: 'home';
  reason?: string;
}

export interface LaunchAppAction {
  action: 'launch_app';
  package: string;
  reason?: string;
}

export interface WaitAction {
  action: 'wait';
  duration_ms?: number;
  reason?: string;
}

export interface FinishAction {
  action: 'finish';
  reason?: string;
}

export interface FailAction {
  action: 'fail';
  reason: string;
}

export type AgentAction =
  | TapAction
  | SwipeAction
  | TypeAction
  | BackAction
  | HomeAction
  | LaunchAppAction
  | WaitAction
  | FinishAction
  | FailAction;

export type ActionType = AgentAction['action'];

// ----------------------------------------------------------
// AI Model Response (raw from Groq)
// ----------------------------------------------------------

export interface AIActionResponse {
  thinking: string;
  action: ActionType;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  duration_ms?: number;
  text?: string;
  package?: string;
  reason?: string;
}

// ----------------------------------------------------------
// Agent State
// ----------------------------------------------------------

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'thinking'
  | 'acting'
  | 'completed'
  | 'failed'
  | 'stopped';

export interface AgentState {
  taskId: string;
  goal: string;
  status: AgentStatus;
  currentStep: number;
  maxSteps: number;
  currentApp: string;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
}

// ----------------------------------------------------------
// Action History
// ----------------------------------------------------------

export interface ActionHistoryEntry {
  step: number;
  action: AgentAction;
  timestamp: number;
  success: boolean;
  thinking: string;
  screenshotBase64?: string;
}

// ----------------------------------------------------------
// WebSocket Messages
// ----------------------------------------------------------

// Server → Client messages
export interface ScreenshotUpdateMessage {
  type: 'screenshot_update';
  screenshotBase64: string;
  timestamp: number;
}

export interface AgentThinkingMessage {
  type: 'agent_thinking';
  thinking: string;
  step: number;
}

export interface ActionExecutedMessage {
  type: 'action_executed';
  entry: ActionHistoryEntry;
}

export interface StatusChangeMessage {
  type: 'status_change';
  state: AgentState;
}

export interface DeviceStatusMessage {
  type: 'device_status';
  device: DeviceInfo | null;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  fatal: boolean;
}

export interface TaskCompleteMessage {
  type: 'task_complete';
  state: AgentState;
  history: ActionHistoryEntry[];
}

export type ServerMessage =
  | ScreenshotUpdateMessage
  | AgentThinkingMessage
  | ActionExecutedMessage
  | StatusChangeMessage
  | DeviceStatusMessage
  | ErrorMessage
  | TaskCompleteMessage;

// Client → Server messages
export interface StartTaskMessage {
  type: 'start_task';
  goal: string;
}

export interface StopAgentMessage {
  type: 'stop_agent';
}

export interface GetDeviceStatusMessage {
  type: 'get_device_status';
}

export type ClientMessage =
  | StartTaskMessage
  | StopAgentMessage
  | GetDeviceStatusMessage;
