"use client";

import type { AgentState } from "../hooks/useAgentSocket";

interface AgentStatusProps {
  state: AgentState | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  idle: {
    label: "Idle",
    color: "text-text-muted",
    bgColor: "bg-text-muted/10",
    icon: "○",
  },
  running: {
    label: "Running",
    color: "text-accent-cyan",
    bgColor: "bg-accent-cyan/10",
    icon: "●",
  },
  thinking: {
    label: "Thinking",
    color: "text-status-info",
    bgColor: "bg-status-info/10",
    icon: "◐",
  },
  acting: {
    label: "Acting",
    color: "text-accent-teal",
    bgColor: "bg-accent-teal/10",
    icon: "▸",
  },
  completed: {
    label: "Completed",
    color: "text-status-success",
    bgColor: "bg-status-success/10",
    icon: "✓",
  },
  failed: {
    label: "Failed",
    color: "text-status-error",
    bgColor: "bg-status-error/10",
    icon: "✗",
  },
  stopped: {
    label: "Stopped",
    color: "text-status-warning",
    bgColor: "bg-status-warning/10",
    icon: "■",
  },
};

export function AgentStatus({ state }: AgentStatusProps) {
  if (!state) {
    return (
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
          Agent Status
        </h2>
        <p className="text-sm text-text-muted">
          No task started yet
        </p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[state.status] || STATUS_CONFIG.idle;
  const elapsed = state.startedAt
    ? Math.floor(
        ((state.completedAt || Date.now()) - state.startedAt) / 1000
      )
    : 0;

  return (
    <div className="glass-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
        Agent Status
      </h2>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor}`}
        >
          <span>{statusConfig.icon}</span>
          {statusConfig.label}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Steps */}
        <div className="bg-surface-elevated rounded-xl p-3">
          <p className="text-xs text-text-muted mb-1">Steps</p>
          <p className="text-lg font-bold gradient-accent-text">
            {state.currentStep}
            <span className="text-xs text-text-muted font-normal">
              {" "}
              / {state.maxSteps}
            </span>
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1 bg-surface-card rounded-full overflow-hidden">
            <div
              className="h-full gradient-accent rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  (state.currentStep / state.maxSteps) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Time */}
        <div className="bg-surface-elevated rounded-xl p-3">
          <p className="text-xs text-text-muted mb-1">Elapsed</p>
          <p className="text-lg font-bold text-text-primary">
            {formatTime(elapsed)}
          </p>
        </div>
      </div>

      {/* Current app */}
      {state.currentApp && state.currentApp !== "unknown" && (
        <div className="mt-3 bg-surface-elevated rounded-xl p-3">
          <p className="text-xs text-text-muted mb-1">Current App</p>
          <p className="text-sm text-text-primary font-mono truncate">
            {state.currentApp}
          </p>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="mt-3 bg-status-error/10 border border-status-error/20 rounded-xl p-3">
          <p className="text-xs text-status-error font-medium mb-1">Error</p>
          <p className="text-xs text-status-error/80">{state.error}</p>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
