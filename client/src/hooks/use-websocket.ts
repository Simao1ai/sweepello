import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@shared/schema";

type WSMessage = { type: string; [key: string]: any };
type MessageHandler = (msg: WSMessage) => void;

let globalSocket: WebSocket | null = null;
const handlers = new Set<MessageHandler>();

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

function connect(userId: string, role: string, name: string, cleanerId?: string) {
  if (globalSocket && globalSocket.readyState === WebSocket.OPEN) return;

  globalSocket = new WebSocket(getWsUrl());

  globalSocket.onopen = () => {
    globalSocket!.send(JSON.stringify({ type: "auth", userId, role, name, cleanerId }));
  };

  globalSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handlers.forEach((h) => h(msg));
    } catch {}
  };

  globalSocket.onclose = () => {
    globalSocket = null;
    setTimeout(() => {
      if (userId) connect(userId, role, name, cleanerId);
    }, 3000);
  };

  globalSocket.onerror = () => {
    globalSocket?.close();
  };
}

export function sendWsMessage(payload: object) {
  if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
    globalSocket.send(JSON.stringify(payload));
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
