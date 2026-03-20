import { useEffect, useRef } from "react";
import { useAuth } from "./use-auth";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@shared/schema";

type WSMessage = { type: string; [key: string]: any };
type MessageHandler = (msg: WSMessage) => void;

let globalSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Set<MessageHandler>();

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

function connect(userId: string, role: string, name: string, cleanerId?: string) {
  // Don't create a new socket if one is already open or connecting
  if (
    globalSocket &&
    (globalSocket.readyState === WebSocket.OPEN ||
      globalSocket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const socket = new WebSocket(getWsUrl());
  globalSocket = socket;

  socket.onopen = () => {
    // Only send if this socket is still the active one and actually open
    if (socket === globalSocket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: "auth", userId, role, name, cleanerId }));
      } catch {}
    }
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handlers.forEach((h) => h(msg));
    } catch {}
  };

  socket.onclose = () => {
    if (socket === globalSocket) {
      globalSocket = null;
    }
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (userId) connect(userId, role, name, cleanerId);
    }, 3000);
  };

  socket.onerror = () => {
    try { socket.close(); } catch {}
  };
}

export function sendWsMessage(payload: object) {
  if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
    try {
      globalSocket.send(JSON.stringify(payload));
    } catch {}
  }
}

export function useWebSocket(onMessage?: MessageHandler) {
  const { user } = useAuth();
  const { data: profile } = useQuery<UserProfile | null>({ queryKey: ["/api/profile"] });
  const handlerRef = useRef<MessageHandler | null>(null);

  const { data: cleanerProfile } = useQuery<any>({
    queryKey: ["/api/contractor/profile"],
    enabled: profile?.role === "contractor",
  });

  useEffect(() => {
    if (!user || !profile) return;
    connect(
      user.id,
      profile.role,
      (user as any).firstName || (user as any).email || "User",
      cleanerProfile?.id
    );
  }, [user, profile, cleanerProfile]);

  useEffect(() => {
    if (!onMessage) return;
    handlerRef.current = onMessage;
    const handler: MessageHandler = (msg) => handlerRef.current?.(msg);
    handlers.add(handler);
    return () => { handlers.delete(handler); };
  }, [onMessage]);

  return { sendWsMessage };
}
