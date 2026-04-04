import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, X, Minimize2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import type { Message } from "@shared/schema";

interface JobChatProps {
  jobId: string;
  currentUserId: string;
  currentUserRole: "client" | "contractor";
  currentUserName: string;
  otherPartyName?: string;
}

export default function JobChat({ jobId, currentUserId, currentUserRole, currentUserName, otherPartyName }: JobChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages", jobId],
    queryFn: async () => {
      const r = await fetch(`/api/messages/${jobId}`, { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

  useEffect(() => {
    if (Array.isArray(messages)) setLocalMessages(messages);
  }, [messages]);

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === "new_message" && msg.jobId === jobId) {
      if (msg.message && msg.message.senderId !== currentUserId) {
        setLocalMessages(prev => {
          const exists = prev.some(m => m.id === msg.message.id);
          if (exists) return prev;
          return [...prev, msg.message];
        });
      }
    }
  }, [jobId, currentUserId]);

  useWebSocket(handleWsMessage);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        jobId,
        senderId: currentUserId,
        senderRole: currentUserRole,
        senderName: currentUserName,
        content,
      });
      return res.json();
    },
    onSuccess: (newMsg) => {
      setLocalMessages(prev => [...prev, newMsg]);
      qc.invalidateQueries({ queryKey: ["/api/messages", jobId] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(trimmed);
  };

  const unreadCount = localMessages.filter(m => !m.isRead && m.senderId !== currentUserId).length;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 h-96 bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {otherPartyName ? `Chat with ${otherPartyName}` : "Job Chat"}
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:opacity-70 transition-opacity" data-testid="button-close-chat">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {localMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                No messages yet. Start the conversation!
              </div>
            ) : (
              localMessages.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-muted-foreground px-1">{msg.senderName}</span>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        isOwn
                          ? "bg-blue-600 text-white rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}
                      data-testid={`message-bubble-${msg.id}`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 px-1">
                      {new Date(msg.createdAt!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="h-9 min-h-0 resize-none text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              data-testid="input-chat-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
              className="shrink-0 h-9 w-9 bg-blue-600 hover:bg-blue-700"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 relative"
          data-testid="button-open-chat"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
