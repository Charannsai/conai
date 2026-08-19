"use client";

interface ScreenViewerProps {
  screenshot: string | null;
  thinking: string | null;
}

export function ScreenViewer({ screenshot, thinking }: ScreenViewerProps) {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3 self-start">
        Live Screen
      </h2>

      <div className="phone-frame w-full max-w-[320px]">
        {/* Notch */}
        <div className="flex justify-center mb-1">
          <div className="w-16 h-1 rounded-full bg-white/10" />
        </div>

        {/* Screen */}
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-[9/19.5]">
          {screenshot ? (
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Phone screen"
              className="w-full h-full object-contain animate-fade-in"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
              <svg
                className="w-12 h-12 mb-3 opacity-30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <p className="text-xs">No screen captured yet</p>
              <p className="text-xs mt-1 opacity-50">
                Start a task to see the phone
              </p>
            </div>
          )}

          {/* Thinking overlay */}
          {thinking && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                  <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                  <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                </div>
                <p className="text-xs text-text-secondary truncate">
                  {thinking}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Home indicator */}
        <div className="flex justify-center mt-2">
          <div className="w-20 h-1 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}
