"use client";

import { useEffect, useRef } from "react";
import type { ActionHistoryEntry, ActionType } from "../hooks/useAgentSocket";

interface ActionLogProps {
  entries: ActionHistoryEntry[];
}

const ACTION_STYLES: Record<
  ActionType,
  { label: string; tagClass: string }
> = {
  tap: { label: "TAP", tagClass: "bg-neutral-100 text-neutral-800 border-neutral-200" },
  swipe: { label: "SWIPE", tagClass: "bg-neutral-100 text-neutral-800 border-neutral-200" },
  type: { label: "TYPE", tagClass: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  back: { label: "BACK", tagClass: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  home: { label: "HOME", tagClass: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  launch_app: { label: "LAUNCH", tagClass: "bg-purple-50 text-purple-800 border-purple-200" },
  wait: { label: "WAIT", tagClass: "bg-amber-50 text-amber-800 border-amber-200" },
  finish: { label: "FINISH", tagClass: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  fail: { label: "FAIL", tagClass: "bg-red-50 text-red-800 border-red-200" },
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="card p-4 flex flex-col" style={{ maxHeight: "560px" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-text-muted">
          Action Log
        </h2>
        {entries.length > 0 && (
          <span className="text-[11px] text-text-muted">
            {entries.length} step{entries.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-2"
      >
        {entries.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            Actions will appear here as the agent runs.
          </div>
        ) : (
          entries.map((entry, i) => {
            const style = ACTION_STYLES[entry.action.action] || ACTION_STYLES.tap;
            return (
              <div
                key={`${entry.step}-${i}`}
                className="action-entry p-2.5 rounded-lg border border-border-subtle bg-surface-secondary text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-[10px] font-bold">
                      {entry.step}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${style.tagClass}`}>
                      {style.label}
                    </span>
                    <span className="font-mono text-[11px] text-text-secondary truncate max-w-[140px]">
                      {formatActionDetails(entry)}
                    </span>
                  </div>

                  <span className="text-[10px] text-text-muted">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>

                {entry.thinking && (
                  <p className="text-[11px] text-text-secondary leading-relaxed bg-white p-2 rounded border border-border-subtle/60">
                    {entry.thinking}
                  </p>
                )}

                {!entry.success && (
                  <p className="text-[10px] text-status-error font-medium">
                    ⚠ Action did not succeed
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
