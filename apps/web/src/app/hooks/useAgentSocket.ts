"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ============================================================
// Types (inlined to avoid cross-package dependency issues with
// Next.js — shared types are re-declared here for the client)
// ============================================================

export type ActionType =
  | "tap"
  | "swipe"
  | "type"
  | "back"
  | "home"
  | "launch_app"
  | "wait"
  | "finish"
  | "fail";

export type AgentStatus =
  | "idle"
  | "running"
  | "thinking"
  | "acting"
  | "completed"
  | "failed"
  | "stopped";

export interface DeviceInfo {
  id: string;
  model: string;
  androidVersion: string;
  screenWidth: number;
  screenHeight: number;
  connected: boolean;
}

export interface AgentAction {
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

export interface ActionHistoryEntry {
  step: number;
  action: AgentAction;
  timestamp: number;
  success: boolean;
  thinking: string;
}

// ============================================================
// WebSocket Hook
// ============================================================

interface UseAgentSocketReturn {
  connected: boolean;
  device: DeviceInfo | null;
  agentState: AgentState | null;
  screenshot: string | null;
  thinking: string | null;
  actionLog: ActionHistoryEntry[];
  error: string | null;
  startTask: (goal: string) => void;
  stopAgent: () => void;
  refreshDevice: () => void;
  isStreaming: boolean;
  startStream: () => void;
  stopStream: () => void;
}

const WS_URL = "ws://localhost:4000";

export function useAgentSocket(): UseAgentSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [thinking, setThinking] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<ActionHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      const socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        setConnected(true);
        setError(null);
        console.log("[WS] Connected to agent server");
      };

      socket.onclose = () => {
        setConnected(false);
        console.log("[WS] Disconnected. Reconnecting in 3s...");
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        setError("Cannot connect to agent server. Is it running on port 4000?");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch {
          console.error("[WS] Failed to parse message");
        }
      };

      ws.current = socket;
    } catch {
      setError("Failed to create WebSocket connection");
      reconnectTimeout.current = setTimeout(connect, 3000);
    }
  }, []);

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case "device_status":
        setDevice(message.device);
        break;

      case "screenshot_update":
        setScreenshot(message.screenshotBase64);
        break;

      case "agent_thinking":
        setThinking(message.thinking);
        break;

      case "action_executed":
        setActionLog((prev) => [...prev, message.entry]);
        break;

      case "status_change":
        setAgentState(message.state);
        // Clear thinking when not in thinking state
        if (message.state.status !== "thinking") {
          setThinking(null);
        }
        break;

      case "task_complete":
        setAgentState(message.state);
        setThinking(null);
        break;

      case "error":
        setError(message.message);
        break;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((message: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const startTask = useCallback(
    (goal: string) => {
      setActionLog([]); // Clear previous log
      setScreenshot(null);
      setThinking(null);
      setError(null);
      sendMessage({ type: "start_task", goal });
    },
    [sendMessage]
  );

  const stopAgent = useCallback(() => {
    sendMessage({ type: "stop_agent" });
  }, [sendMessage]);

  const refreshDevice = useCallback(() => {
    sendMessage({ type: "get_device_status" });
  }, [sendMessage]);

  const startStream = useCallback(() => {
    setIsStreaming(true);
    sendMessage({ type: "start_stream" });
  }, [sendMessage]);

  const stopStream = useCallback(() => {
    setIsStreaming(false);
    sendMessage({ type: "stop_stream" });
  }, [sendMessage]);

  return {
    connected,
    device,
    agentState,
    screenshot,
    thinking,
    actionLog,
    error,
    startTask,
    stopAgent,
    refreshDevice,
    isStreaming,
    startStream,
    stopStream,
  };
}
