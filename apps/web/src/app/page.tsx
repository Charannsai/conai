"use client";

import { useAgentSocket } from "./hooks/useAgentSocket";
import { DeviceStatus } from "./components/DeviceStatus";
import { TaskInput } from "./components/TaskInput";
import { ScreenViewer } from "./components/ScreenViewer";
import { AgentStatus } from "./components/AgentStatus";
import { ActionLog } from "./components/ActionLog";
import { StopButton } from "./components/StopButton";

export default function Dashboard() {
  const {
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
  } = useAgentSocket();

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-accent-text">
                  AI Mobile Operator
                </h1>
                <p className="text-xs text-text-muted">
                  Observe · Reason · Act · Verify
                </p>
              </div>
            </div>

            {/* Connection status pill */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                connected
                  ? "bg-status-success/10 text-status-success"
                  : "bg-status-error/10 text-status-error"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  connected
                    ? "bg-status-success pulse-connected"
                    : "bg-status-error"
                }`}
              />
              {connected ? "Server Connected" : "Server Offline"}
            </div>
          </div>
        </div>
      </header>

      {/* Global error banner */}
      {error && (
        <div className="bg-status-error/10 border-b border-status-error/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-sm text-status-error">{error}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column — Controls & Status */}
          <div className="lg:col-span-4 space-y-4">
            <DeviceStatus
              connected={connected}
              device={device}
              onRefresh={refreshDevice}
            />

            <TaskInput
              onStartTask={startTask}
              agentStatus={agentState?.status}
            />

            <StopButton
              onStop={stopAgent}
              agentStatus={agentState?.status}
            />

            <AgentStatus state={agentState} />
          </div>

          {/* Center column — Phone Screen */}
          <div className="lg:col-span-4">
            <ScreenViewer screenshot={screenshot} thinking={thinking} />
          </div>

          {/* Right column — Action Log */}
          <div className="lg:col-span-4">
            <ActionLog entries={actionLog} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>AI Mobile Operator MVP</span>
            <span>
              Powered by{" "}
              <span className="gradient-accent-text font-medium">Groq</span>{" "}
              · Qwen 3.6 27B
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
