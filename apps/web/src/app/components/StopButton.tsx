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
      className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-status-error hover:bg-red-700 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
      id="stop-agent-button"
    >
      <span className="w-2 h-2 rounded-sm bg-white" />
      Stop Agent
    </button>
  );
}
