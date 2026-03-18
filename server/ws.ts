import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { db } from "./db";
import { cleaners } from "@shared/schema";
import { eq } from "drizzle-orm";

interface AuthedSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  userName?: string;
  cleanerId?: string;
  isAlive: boolean;
}

const connections = new Map<string, AuthedSocket>();

let wss: WebSocketServer;

export function setupWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (socket: AuthedSocket, req) => {
    socket.isAlive = true;

    socket.on("pong", () => { socket.isAlive = true; });

    socket.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case "auth": {
            socket.userId = msg.userId;
            socket.userRole = msg.role;
            socket.userName = msg.name || "Unknown";
            socket.cleanerId = msg.cleanerId || null;
            if (socket.userId) {
              connections.set(socket.userId, socket);
            }
            socket.send(JSON.stringify({ type: "auth_ok" }));
            break;
          }

          case "location_update": {
            if (!socket.userId || !socket.cleanerId) break;
            const { lat, lng } = msg;
            await db.update(cleaners)
              .set({ currentLat: lat.toString(), currentLng: lng.toString(), lastSeenAt: new Date() })
              .where(eq(cleaners.id, socket.cleanerId));
            broadcast({ type: "cleaner_location", cleanerId: socket.cleanerId, lat, lng, name: socket.userName });
            break;
          }

          case "ping": {
            socket.send(JSON.stringify({ type: "pong" }));
            break;
          }

          case "chat_message": {
            const { jobId, content, senderName, senderRole } = msg;
            broadcastToJob(jobId, {
              type: "new_message",
              jobId,
              senderId: socket.userId,
              senderName,
              senderRole,
              content,
              createdAt: new Date().toISOString(),
            });
            break;
          }
        }
      } catch (e) {
        console.error("[WS] message error:", e);
      }
    });

    socket.on("close", () => {
      if (socket.userId) connections.delete(socket.userId);
    });

    socket.on("error", (err) => {
      console.error("[WS] socket error:", err.message);
    });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const s = ws as AuthedSocket;
      if (!s.isAlive) { s.terminate(); return; }
      s.isAlive = false;
      s.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(heartbeat));

  console.log("[WS] WebSocket server ready on /ws");
}

export function sendToUser(userId: string, payload: object) {
  const socket = connections.get(userId);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

export function broadcast(payload: object) {
  const data = JSON.stringify(payload);
  connections.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(data);
  });
}

export function broadcastToRole(role: string, payload: object) {
  const data = JSON.stringify(payload);
  connections.forEach((socket) => {
    if (socket.userRole === role && socket.readyState === WebSocket.OPEN) socket.send(data);
  });
}

export function broadcastToJob(jobId: string, payload: object) {
  broadcast({ ...payload, jobId });
}

export function getOnlineCleanerIds(): string[] {
  const ids: string[] = [];
  connections.forEach((socket) => {
    if (socket.userRole === "contractor" && socket.cleanerId && socket.readyState === WebSocket.OPEN) {
      ids.push(socket.cleanerId);
    }
  });
  return ids;
}

export function getActiveConnectionCount(): number {
  return connections.size;
}
