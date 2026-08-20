"use client";

import { useVideoStream } from "../hooks/useVideoStream";

interface ScreenViewerProps {
  screenshot: string | null;
  thinking: string | null;
}

export function ScreenViewer({ screenshot, thinking }: ScreenViewerProps) {
  const { frame, connected: streamConnected } = useVideoStream();
  const displaySrc = frame || (screenshot ? `data:image/png;base64,${screenshot}` : null);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-3 self-start">
        <h2 className="text-xs font-medium uppercase tracking-widest text-text-muted">
          Screen
        </h2>
        {streamConnected && (
          <span className="text-[9px] bg-status-error text-white px-1.5 py-0.5 rounded-sm font-medium animate-pulse">
            LIVE
          </span>
        )}
      </div>

      <div className="phone-frame w-full max-w-[300px]">
        {/* Notch */}
        <div className="flex justify-center mb-1">
          <div className="w-14 h-1 rounded-full bg-white/10" />
        </div>

        {/* Screen */}
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-[9/19.5]">
          {displaySrc ? (
            <img
              src={displaySrc}
              alt="Phone screen"
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600">
              <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-[11px]">No screen captured</p>
              <p className="text-[10px] mt-0.5 opacity-50">Start a task to begin</p>
            </div>
          )}

          {/* Thinking overlay */}
          {thinking && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <span className="thinking-dot w-1 h-1 rounded-full bg-white" />
                  <span className="thinking-dot w-1 h-1 rounded-full bg-white" />
                  <span className="thinking-dot w-1 h-1 rounded-full bg-white" />
                </div>
                <p className="text-[10px] text-white/70 truncate">{thinking}</p>
              </div>
            </div>
          )}
        </div>

        {/* Home indicator */}
        <div className="flex justify-center mt-1.5">
          <div className="w-16 h-1 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}
