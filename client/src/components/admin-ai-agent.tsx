import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, X, Send, Loader2, Sparkles, RotateCcw, ChevronDown, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface ActionEvent {
  tool: string;
  summary: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  actions?: ActionEvent[];
}

const TOOL_LABELS: Record<string, string> = {
  list_service_requests: "Checking service requests",
  list_jobs: "Fetching jobs",
  list_cleaners: "Looking up cleaners",
  list_clients: "Fetching clients",
  list_applications: "Reviewing applications",
  list_disputes: "Checking disputes",
  get_job_details: "Getting job details",
  broadcast_job_offers: "Broadcasting job offers",
  assign_cleaner_to_request: "Assigning cleaner",
  update_job_status: "Updating job status",
  approve_application: "Approving application",
  reject_application: "Rejecting application",
  resolve_dispute: "Resolving dispute",
  send_notification: "Sending notification",
  get_dashboard_stats: "Pulling dashboard stats",
};

const WRITE_TOOLS = new Set([
  "broadcast_job_offers", "assign_cleaner_to_request", "update_job_status",
  "approve_application", "reject_application", "resolve_dispute", "send_notification",
]);

const QUICK_PROMPTS = [
  "What needs attention right now?",
  "Broadcast all pending requests",
  "Show me today's jobs",
  "Review pending applications",
  "Any open disputes?",
  "Give me a full dashboard summary",
];

function ActionCard({ action }: { action: ActionEvent }) {
  const isWrite = WRITE_TOOLS.has(action.tool);
  return (
    <div className={cn(
      "flex items-start gap-2 text-xs rounded-lg px-3 py-2 my-1",
      isWrite
        ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
        : "bg-muted/60 text-muted-foreground border border-border/50"
    )}>
      {isWrite
        ? <Zap className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-indigo-500" />
        : <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      }
      <div>
        <span className="font-medium">{TOOL_LABELS[action.tool] || action.tool}</span>
        <p className="opacity-80 mt-0.5">{action.summary}</p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={cn("max-w-[87%]", isUser ? "items-end" : "items-start", "flex flex-col gap-1")}>
        {message.actions && message.actions.length > 0 && (
          <div className="w-full space-y-0.5">
            {message.actions.map((a, i) => <ActionCard key={i} action={a} />)}
          </div>
        )}
        {(message.content || message.streaming) && (
          <div className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          )}>
            {message.content}
            {message.streaming && !message.content && (
              <span className="flex gap-1 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
              </span>
            )}
            {message.streaming && message.content && (
              <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-sm align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminAiAgent() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "Hi, I'm Sweepo — I can fully manage your operations. I can assign cleaners, broadcast jobs, approve applications, resolve disputes, send notifications, and more. Just tell me what to do.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  }, []);

  useEffect(() => {
    if (open) { setUnread(0); scrollToBottom(); setTimeout(() => inputRef.current?.focus(), 150); }
  }, [open, scrollToBottom]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const assistantIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true, actions: [] }]);

    try {
      abortRef.current = new AbortController();
      const history = [...messages, userMsg];

      const res = await fetch("/api/admin/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      const collectedActions: ActionEvent[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));

            if (parsed.type === "action") {
              collectedActions.push({ tool: parsed.tool, summary: parsed.summary });
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, actions: [...collectedActions] } : m
              ));
              // Invalidate relevant query caches so the UI updates after actions
              if (WRITE_TOOLS.has(parsed.tool)) {
                queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
                queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
                queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
                queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
                queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
              }
            } else if (parsed.content) {
              accumulated += parsed.content;
              const snap = accumulated;
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: snap } : m
              ));
            } else if (parsed.done) {
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, streaming: false } : m
              ));
              if (!open) setUnread(n => n + 1);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, content: "Sorry, something went wrong. Please try again.", streaming: false }
            : m
        ));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, messages, open, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleReset = () => {
    if (loading) abortRef.current?.abort();
    setMessages([{
      role: "assistant",
      content: "Conversation reset. What would you like to do?",
    }]);
    setLoading(false);
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="w-[380px] flex flex-col rounded-2xl border shadow-2xl bg-background overflow-hidden" style={{ maxHeight: "calc(100vh - 100px)" }}>
            <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 dark:bg-indigo-700 text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-sm leading-tight">Sweepo</p>
                  <p className="text-xs text-indigo-200">AI Operations Manager</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-indigo-500" onClick={handleReset} title="Reset" data-testid="button-ai-reset">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-indigo-500" onClick={() => setOpen(false)} data-testid="button-ai-close">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-0" style={{ maxHeight: "380px" }}>
              {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
            </div>

            {messages.length === 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    disabled={loading}
                    className="text-xs px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors disabled:opacity-50"
                    data-testid={`button-quick-${p.toLowerCase().replace(/\W+/g, "-").slice(0, 25)}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t p-3 flex gap-2 flex-shrink-0">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell Sweepo what to do…"
                className="resize-none text-sm min-h-[40px] max-h-[100px]"
                rows={1}
                disabled={loading}
                data-testid="input-ai-message"
              />
              <Button
                size="icon"
                className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                data-testid="button-ai-send"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            "relative h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
            "bg-indigo-600 hover:bg-indigo-700 text-white",
            open && "rotate-12"
          )}
          data-testid="button-ai-toggle"
          title="Sweepo AI"
        >
          {open
            ? <X className="h-6 w-6" />
            : <>
                <Sparkles className="h-6 w-6" />
                {unread > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-red-500 border-0 justify-center">
                    {unread}
                  </Badge>
                )}
              </>
          }
        </button>
      </div>
    </>
  );
}
