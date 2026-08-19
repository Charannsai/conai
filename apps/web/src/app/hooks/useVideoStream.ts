"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_STREAM_URL = "ws://localhost:8000/ws/stream";

export function useVideoStream() {
  const ws = useRef<WebSocket | null>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(WS_STREAM_URL);
    socket.binaryType = "blob";

    socket.onopen = () => {
      setConnected(true);
      console.log("[WS] Connected to video stream");
    };

    socket.onmessage = (event) => {
      // Create object URL from binary blob (much faster than base64)
      if (event.data instanceof Blob) {
        const url = URL.createObjectURL(event.data);
        setFrame((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl); // cleanup
          return url;
        });
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    ws.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  return { frame, connected };
}
