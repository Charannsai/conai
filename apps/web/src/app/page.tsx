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
    isStreaming,
    startStream,
    stopStream,
  } = useAgentSocket();

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-accent-primary flex items-center justify-center">
                <span className="text-white text-[11px] font-bold tracking-tight">AI</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-text-primary tracking-tight">
                  AI Mobile Operator
                </h1>
                <p className="text-[11px] text-text-muted">
                  Observe · Reason · Act
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  connected ? "bg-status-success pulse-connected" : "bg-status-error"
                }`}
              />
              <span className="text-[11px] text-text-muted">
                {connected ? "Connected" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="border-b border-status-error/20 bg-status-error/5">
          <div className="max-w-7xl mx-auto px-6 py-2">
            <p className="text-xs text-status-error">{error}</p>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left — Controls */}
          <div className="lg:col-span-4 space-y-4">
            <DeviceStatus
              connected={connected}
              device={device}
              onRefresh={refreshDevice}
              isStreaming={isStreaming}
              onStartStream={startStream}
              onStopStream={stopStream}
            />
            <TaskInput onStartTask={startTask} agentStatus={agentState?.status} />
            <StopButton onStop={stopAgent} agentStatus={agentState?.status} />
            <AgentStatus state={agentState} />
          </div>

          {/* Center — Phone */}
          <div className="lg:col-span-4">
            <ScreenViewer screenshot={screenshot} thinking={thinking} />
          </div>

          {/* Right — Log */}
          <div className="lg:col-span-4">
            <ActionLog entries={actionLog} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>AI Mobile Operator</span>
            <span>Powered by Groq</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
