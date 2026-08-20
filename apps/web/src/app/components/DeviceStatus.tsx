"use client";

import type { DeviceInfo } from "../hooks/useAgentSocket";

interface DeviceStatusProps {
  connected: boolean;
  device: DeviceInfo | null;
  onRefresh: () => void;
  isStreaming: boolean;
  onStartStream: () => void;
  onStopStream: () => void;
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
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-text-muted">
          Device
        </h2>
        <button
          onClick={onRefresh}
          className="text-[10px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {device ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${device.connected ? "bg-status-success" : "bg-status-error"}`} />
            <span className="text-sm font-medium text-text-primary">{device.model}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
            <div>
              <span className="text-text-muted">Android </span>
              {device.androidVersion}
            </div>
            <div>
              <span className="text-text-muted">Screen </span>
              {device.screenWidth}×{device.screenHeight}
            </div>
          </div>
          <div className="text-[10px] text-text-muted font-mono truncate">
            {device.id}
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-muted">No device connected</p>
      )}
    </div>
  );
}
