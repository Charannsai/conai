"use client";

import { useState, useCallback } from "react";
import type { AgentStatus } from "../hooks/useAgentSocket";

interface TaskInputProps {
  onStartTask: (goal: string) => void;
  agentStatus?: AgentStatus;
}

const SUGGESTIONS = [
  "Open Settings and check battery",
  "Open X and tweet a random joke",
  "Open Chrome and search for weather",
  "Open Calculator and compute 42 × 17",
];

export function TaskInput({ onStartTask, agentStatus }: TaskInputProps) {
  const [goal, setGoal] = useState("");
  const isRunning = agentStatus === "running" || agentStatus === "thinking" || agentStatus === "acting";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (goal.trim() && !isRunning) {
        onStartTask(goal.trim());
      }
    },
    [goal, isRunning, onStartTask]
  );

  return (
    <div className="card p-4">
      <h2 className="text-xs font-medium uppercase tracking-widest text-text-muted mb-3">
        Task
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What should the agent do?"
            disabled={isRunning}
            className="w-full px-3 py-2.5 text-sm bg-surface-secondary border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted disabled:opacity-50 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!goal.trim() || isRunning}
          className="w-full mt-2 px-3 py-2 text-xs font-medium bg-accent-primary text-white rounded-lg disabled:opacity-30 hover:bg-accent-secondary transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isRunning ? "Running..." : "Start Task"}
        </button>
      </form>

      <div className="mt-3">
        <p className="text-[10px] text-text-muted mb-1.5">Suggestions</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setGoal(s)}
              disabled={isRunning}
              className="text-[10px] px-2 py-1 rounded-md border border-border-subtle text-text-secondary hover:border-accent-primary hover:text-text-primary transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
