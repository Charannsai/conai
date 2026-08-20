"use client";

import type { AgentState } from "../hooks/useAgentSocket";

interface AgentStatusProps {
  state: AgentState | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  idle: {
    label: "Idle",
    color: "text-text-muted",
    bg: "bg-surface-secondary",
    dot: "bg-neutral-400",
  },
  running: {
    label: "Running",
    color: "text-text-primary",
    bg: "bg-neutral-100",
    dot: "bg-black animate-pulse",
  },
  thinking: {
    label: "Thinking",
    color: "text-text-primary",
    bg: "bg-neutral-100",
    dot: "bg-black animate-pulse",
  },
  acting: {
    label: "Acting",
    color: "text-text-primary",
    bg: "bg-neutral-100",
    dot: "bg-black",
  },
  completed: {
    label: "Completed",
    color: "text-status-success",
    bg: "bg-emerald-50",
    dot: "bg-status-success",
  },
  failed: {
    label: "Failed",
    color: "text-status-error",
    bg: "bg-red-50",
    dot: "bg-status-error",
  },
  stopped: {
    label: "Stopped",
    color: "text-status-warning",
    bg: "bg-amber-50",
    dot: "bg-status-warning",
  },
};

export function AgentStatus({ state }: AgentStatusProps) {
  if (!state) {
    return (
      <div className="card p-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-text-muted mb-2">
          Status
        </h2>
        <p className="text-xs text-text-muted">No task running</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[state.status] || STATUS_CONFIG.idle;
  const elapsed = state.startedAt
    ? Math.floor(((state.completedAt || Date.now()) - state.startedAt) / 1000)
    : 0;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-text-muted">
          Status
        </h2>
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          {statusConfig.label}
        </div>
      </div>

      {/* Goal */}
      {state.goal && (
        <div className="bg-surface-secondary p-2.5 rounded-lg border border-border-subtle">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Goal</p>
          <p className="text-xs text-text-primary font-medium line-clamp-2 leading-relaxed">
            {state.goal}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-secondary p-2.5 rounded-lg border border-border-subtle">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Steps</p>
          <p className="text-sm font-semibold text-text-primary">
            {state.currentStep} <span className="text-xs font-normal text-text-muted">/ {state.maxSteps}</span>
          </p>
          <div className="mt-1.5 h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((state.currentStep / state.maxSteps) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-surface-secondary p-2.5 rounded-lg border border-border-subtle">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Elapsed</p>
          <p className="text-sm font-semibold text-text-primary">{formatTime(elapsed)}</p>
        </div>
      </div>

      {/* Current App */}
      {state.currentApp && state.currentApp !== "unknown" && (
        <div className="flex items-center justify-between text-xs px-1 text-text-secondary">
          <span className="text-text-muted">Active App</span>
          <span className="font-mono text-[11px] text-text-primary truncate max-w-[180px]">
            {state.currentApp}
          </span>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-status-error text-xs">
          <p className="font-medium mb-0.5">Error</p>
          <p className="text-[11px] opacity-90">{state.error}</p>
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
