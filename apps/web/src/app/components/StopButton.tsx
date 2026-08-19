"use client";

import type { AgentStatus } from "../hooks/useAgentSocket";

interface StopButtonProps {
  onStop: () => void;
  agentStatus: AgentStatus | undefined;
}

export function StopButton({ onStop, agentStatus }: StopButtonProps) {
  const isRunning =
    agentStatus === "running" ||
    agentStatus === "thinking" ||
    agentStatus === "acting";

  if (!isRunning) return null;

  return (
    <button
      onClick={onStop}
      className="w-full py-3 px-6 rounded-xl text-sm font-bold text-white bg-status-error hover:bg-red-600 transition-all stop-button-pulse"
      id="stop-agent-button"
    >
      ■ STOP AGENT
    </button>
  );
}
