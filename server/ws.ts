import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { db } from "./db";
import { cleaners } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";

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
            const { userId, role, name, cleanerId } = msg;

            // Fix 3: Validate claimed identity server-side — never trust client-provided role/userId.
            if (!userId) {
              socket.send(JSON.stringify({ type: "auth_error", reason: "userId required" }));
              return;
            }

            const profile = await storage.getUserProfile(userId);
            if (!profile) {
              socket.send(JSON.stringify({ type: "auth_error", reason: "User not found" }));
              return;
            }

            if (profile.role !== role) {
              socket.send(JSON.stringify({ type: "auth_error", reason: "Role mismatch" }));
              return;
            }

            // If claiming to be a contractor with a specific cleanerId, verify it
            if (role === "contractor" && cleanerId) {
              const cleaner = await storage.getCleanerByUserId(userId);
              if (!cleaner || cleaner.id !== cleanerId) {
                socket.send(JSON.stringify({ type: "auth_error", reason: "Cleaner identity mismatch" }));
                return;
              }
              socket.cleanerId = cleanerId;
            }

            socket.userId = userId;
            socket.userRole = profile.role;
            socket.userName = name || "Unknown";
            connections.set(socket.userId, socket);
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
            // Only authenticated sockets may send chat messages
            if (!socket.userId || !socket.userRole) {
              socket.send(JSON.stringify({ type: "error", reason: "Not authenticated" }));
              break;
            }

            const { jobId, content, senderName, senderRole } = msg;
            if (!jobId || !content) break;

            // Fix 4: Persist the message to the database before broadcasting.
            try {
              await storage.createMessage({
                jobId,
                senderId: socket.userId,
                senderRole: socket.userRole,
                senderName: senderName || socket.userName || "Unknown",
                content,
              });
            } catch (dbErr) {
              console.error("[WS] Failed to persist chat message:", dbErr);
            }

            broadcastToJob(jobId, {
              type: "new_message",
              jobId,
              senderId: socket.userId,
              senderName: senderName || socket.userName,
              senderRole: senderRole || socket.userRole,
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
