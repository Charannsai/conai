"use client";

import { useState } from "react";
import type { AgentStatus } from "../hooks/useAgentSocket";

interface TaskInputProps {
  onStartTask: (goal: string) => void;
  agentStatus: AgentStatus | undefined;
}

const EXAMPLE_TASKS = [
  "Open Calculator and calculate 25 × 16",
  "Open Chrome and search for AI agents",
  "Open YouTube and search for AI agents",
  "Open Settings and go to About Phone",
];

export function TaskInput({ onStartTask, agentStatus }: TaskInputProps) {
  const [goal, setGoal] = useState("");

  const isRunning =
    agentStatus === "running" ||
    agentStatus === "thinking" ||
    agentStatus === "acting";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (goal.trim() && !isRunning) {
      onStartTask(goal.trim());
    }
  };

  const handleExampleClick = (task: string) => {
    setGoal(task);
  };

  return (
    <div className="glass-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
        Task
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Tell the agent what to do..."
            disabled={isRunning}
            className="w-full bg-surface-elevated border border-border-default rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            id="task-input"
          />
        </div>

        <button
          type="submit"
          disabled={!goal.trim() || isRunning}
          className="w-full mt-3 gradient-accent text-white font-semibold py-3 px-6 rounded-xl text-sm transition-all hover:opacity-90 hover:shadow-lg hover:shadow-accent-cyan/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
          id="start-agent-button"
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <span className="thinking-dot inline-block w-1.5 h-1.5 rounded-full bg-white" />
              <span className="thinking-dot inline-block w-1.5 h-1.5 rounded-full bg-white" />
              <span className="thinking-dot inline-block w-1.5 h-1.5 rounded-full bg-white" />
              <span className="ml-1">Agent Running</span>
            </span>
          ) : (
            "▶ Start Agent"
          )}
        </button>
      </form>

      {/* Example tasks */}
      <div className="mt-4">
        <p className="text-xs text-text-muted mb-2">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TASKS.map((task) => (
            <button
              key={task}
              onClick={() => handleExampleClick(task)}
              disabled={isRunning}
              className="text-xs px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-text-secondary hover:text-accent-cyan hover:border-accent-cyan/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {task}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
