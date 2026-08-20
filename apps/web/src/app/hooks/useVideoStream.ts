"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_STREAM_URL = "ws://localhost:8000/ws/stream";

export function useVideoStream() {
  const ws = useRef<WebSocket | null>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      const socket = new WebSocket(WS_STREAM_URL);
      socket.binaryType = "blob";

      socket.onopen = () => {
        setConnected(true);
        console.log("[WS] Connected to video stream");
      };

      socket.onmessage = (event) => {
        if (event.data instanceof Blob) {
          const url = URL.createObjectURL(event.data);
          setFrame((prevUrl) => {
            if (prevUrl) URL.revokeObjectURL(prevUrl);
            return url;
          });
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      ws.current = socket;
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws.current?.close();
    };
  }, []);

  return { frame, connected };
}
