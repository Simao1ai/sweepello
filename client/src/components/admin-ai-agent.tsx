import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, X, Send, Loader2, ChevronDown, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const QUICK_PROMPTS = [
  "Summarize today's operations",
  "Which cleaners are online now?",
  "Show pending service requests",
  "What's this month's performance?",
  "How does surge pricing work?",
  "Help me assign a job",
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}
      >
        {message.content}
        {message.streaming && (
          <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-sm align-middle" />
        )}
      </div>
    </div>
  );
}

export function AdminAiAgent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm Sweepo, your dispatch AI assistant. I have live access to your jobs, cleaners, and business data. What can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  useEffect(() => {
    if (open) {
      setUnread(0);
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "", streaming: true };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const allMessages = [...messages, userMsg];

      const res = await fetch("/api/admin/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

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
            if (parsed.done) {
              setMessages(prev =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, streaming: false } : m
                )
              );
            } else if (parsed.content) {
              accumulated += parsed.content;
              const snap = accumulated;
              setMessages(prev =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: snap } : m
                )
              );
            }
          } catch {}
        }
      }

      if (!open) setUnread(n => n + 1);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev =>
          prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: "Sorry, I ran into an error. Please try again.", streaming: false }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, messages, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    if (loading) abortRef.current?.abort();
    setMessages([{
      role: "assistant",
      content: "Hi! I'm Sweepo, your dispatch AI. How can I help you today?",
    }]);
    setLoading(false);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={cn(
        "fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3",
      )}>
        {open && (
          <div className="w-[360px] max-h-[560px] flex flex-col rounded-2xl border shadow-2xl bg-background overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 dark:bg-indigo-700 text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-sm leading-tight">Sweepo</p>
                  <p className="text-xs text-indigo-200">AI Dispatch Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-indigo-500"
                  onClick={handleReset}
                  title="Reset conversation"
                  data-testid="button-ai-reset"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-indigo-500"
                  onClick={() => setOpen(false)}
                  data-testid="button-ai-close"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 min-h-0"
              style={{ maxHeight: "340px" }}
            >
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
            </div>

            {messages.length === 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-xs px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                    data-testid={`button-quick-${p.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`}
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
                placeholder="Ask Sweepo anything…"
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
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
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
          title="Ask Sweepo AI"
        >
          {open ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <Sparkles className="h-6 w-6" />
              {unread > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-red-500 border-0 justify-center">
                  {unread}
                </Badge>
              )}
            </>
          )}
        </button>
      </div>
    </>
  );
}
