"use client";

import { useEffect, useRef } from "react";
import type { ActionHistoryEntry, ActionType } from "../hooks/useAgentSocket";

interface ActionLogProps {
  entries: ActionHistoryEntry[];
}

const ACTION_STYLES: Record<
  ActionType,
  { color: string; bgColor: string; icon: string }
> = {
  tap: { color: "text-action-tap", bgColor: "bg-action-tap/10", icon: "👆" },
  swipe: {
    color: "text-action-swipe",
    bgColor: "bg-action-swipe/10",
    icon: "👉",
  },
  type: {
    color: "text-action-type",
    bgColor: "bg-action-type/10",
    icon: "⌨️",
  },
  back: { color: "text-action-nav", bgColor: "bg-action-nav/10", icon: "◀" },
  home: { color: "text-action-nav", bgColor: "bg-action-nav/10", icon: "🏠" },
  launch_app: {
    color: "text-action-launch",
    bgColor: "bg-action-launch/10",
    icon: "🚀",
  },
  wait: {
    color: "text-action-wait",
    bgColor: "bg-action-wait/10",
    icon: "⏳",
  },
  finish: {
    color: "text-action-finish",
    bgColor: "bg-action-finish/10",
    icon: "✅",
  },
  fail: {
    color: "text-action-fail",
    bgColor: "bg-action-fail/10",
    icon: "❌",
  },
};

function formatActionDetails(entry: ActionHistoryEntry): string {
  const { action } = entry;
  switch (action.action) {
    case "tap":
      return `(${action.x}, ${action.y})`;
    case "swipe":
      return `(${action.x1},${action.y1}) → (${action.x2},${action.y2})`;
    case "type":
      return `"${action.text}"`;
    case "launch_app":
      return action.package || "";
    case "wait":
      return `${action.duration_ms || 1500}ms`;
    case "finish":
    case "fail":
      return action.reason || "";
    default:
      return "";
  }
}

export function ActionLog({ entries }: ActionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="glass-card p-5 flex flex-col" style={{ maxHeight: "500px" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Action Log
        </h2>
        {entries.length > 0 && (
          <span className="text-xs text-text-muted">
            {entries.length} action{entries.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-2"
      >
        {entries.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            Actions will appear here as the agent runs.
          </p>
        ) : (
          entries.map((entry, i) => {
            const style = ACTION_STYLES[entry.action.action] || ACTION_STYLES.tap;
            return (
              <div
                key={`${entry.step}-${i}`}
                className={`action-entry flex items-start gap-3 p-3 rounded-xl ${style.bgColor} border border-transparent hover:border-border-subtle transition-colors`}
              >
                {/* Step number */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center">
                  <span className="text-xs font-bold text-text-secondary">
                    {entry.step}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{style.icon}</span>
                    <span className={`text-sm font-medium ${style.color}`}>
                      {entry.action.action}
                    </span>
                    <span className="text-xs text-text-muted font-mono truncate">
                      {formatActionDetails(entry)}
                    </span>
                  </div>

                  {/* Thinking */}
                  <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">
                    {entry.thinking}
                  </p>

                  {/* Failure indicator */}
                  {!entry.success && (
                    <span className="inline-block text-xs text-status-error mt-1">
                      ⚠ Action failed
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-xs text-text-muted flex-shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
