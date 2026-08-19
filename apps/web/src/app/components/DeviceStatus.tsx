"use client";

import type { DeviceInfo } from "../hooks/useAgentSocket";

interface DeviceStatusProps {
  connected: boolean;
  device: DeviceInfo | null;
  onRefresh: () => void;
  isStreaming?: boolean;
  onStartStream?: () => void;
  onStopStream?: () => void;
}

export function DeviceStatus({
  connected,
  device,
  onRefresh,
  isStreaming,
  onStartStream,
  onStopStream,
}: DeviceStatusProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Device
        </h2>
        <div className="flex items-center gap-3">
          {connected && onStartStream && onStopStream && (
            <button
              onClick={isStreaming ? onStopStream : onStartStream}
              className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                isStreaming
                  ? "bg-status-error/20 text-status-error hover:bg-status-error/30"
                  : "bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20"
              }`}
              title={isStreaming ? "Stop Live Stream" : "Start Live Stream"}
            >
              {isStreaming ? "⏹ Stop Stream" : "▶ Live Stream"}
            </button>
          )}
          <button
            onClick={onRefresh}
            className="text-xs text-text-muted hover:text-accent-cyan transition-colors"
            title="Refresh device status"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="relative">
          <div
            className={`w-3 h-3 rounded-full ${
              connected && device
                ? "bg-status-success pulse-connected"
                : "bg-status-error"
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {connected && device
              ? device.model
              : connected
                ? "No device found"
                : "Disconnected"}
          </p>
          {connected && device && (
            <p className="text-xs text-text-muted mt-0.5">
              Android {device.androidVersion} · {device.screenWidth}×
              {device.screenHeight}
            </p>
          )}
          {!connected && (
            <p className="text-xs text-status-error mt-0.5">
              Agent server not running
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
