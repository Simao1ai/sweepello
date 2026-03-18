import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, Zap, MessageSquare, TrendingUp, Bot } from "lucide-react";
import type { AiUsageLog } from "@shared/schema";

interface AiUsageStats {
  todayCost: number;
  monthCost: number;
  allTimeCost: number;
  totalConversations: number;
  totalTokens: number;
  dailyUsage: { date: string; cost: number; tokens: number; conversations: number }[];
}

function formatCost(n: number) {
  if (n < 0.01) return `$${(n * 100).toFixed(4)}¢`;
  return `$${n.toFixed(4)}`;
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AiUsage() {
  const { data: stats, isLoading: statsLoading } = useQuery<AiUsageStats>({
    queryKey: ["/api/admin/ai-usage/stats"],
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<AiUsageLog[]>({
    queryKey: ["/api/admin/ai-usage/logs"],
  });

  const chartData = (stats?.dailyUsage ?? []).map(d => ({
    ...d,
    label: formatDate(d.date),
    costCents: parseFloat((d.cost * 100).toFixed(4)),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
          <Bot className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sweepo AI Cost Tracker</h1>
          <p className="text-sm text-muted-foreground">GPT-4o usage · $5/1M input tokens · $15/1M output tokens</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-ai-today-cost">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Today's Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400" data-testid="text-today-cost">
              {statsLoading ? "..." : formatCost(stats?.todayCost ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-ai-month-cost">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-month-cost">
              {statsLoading ? "..." : formatCost(stats?.monthCost ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-ai-total-cost">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              All-Time Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-alltime-cost">
              {statsLoading ? "..." : formatCost(stats?.allTimeCost ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-ai-conversations">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversations">
              {statsLoading ? "..." : stats?.totalConversations ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1" data-testid="text-total-tokens">
              {statsLoading ? "" : `${formatTokens(stats?.totalTokens ?? 0)} total tokens`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Cost — Last 30 Days (¢)</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 11 }} unit="¢" />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(4)}¢`, "Cost"]}
                  labelStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="costCents" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Conversation Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No conversations recorded yet. Use Sweepo to start tracking costs.
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
                  data-testid={`row-ai-log-${log.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-foreground" data-testid={`text-log-message-${log.id}`}>
                      {log.userMessage || <span className="italic text-muted-foreground">No message recorded</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span data-testid={`text-log-date-${log.id}`}>
                        {new Date(log.createdAt!).toLocaleString()}
                      </span>
                      <span>{log.rounds} {log.rounds === 1 ? "round" : "rounds"}</span>
                      <span data-testid={`text-log-tokens-${log.id}`}>
                        {formatTokens(log.totalTokens)} tokens
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      variant="secondary"
                      className="font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30"
                      data-testid={`text-log-cost-${log.id}`}
                    >
                      {formatCost(parseFloat(log.costUsd))}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {log.promptTokens}↑ {log.completionTokens}↓
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Reference */}
      <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">GPT-4o Pricing Reference</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Input tokens</span>
              <div className="font-mono font-semibold">$5.00 / 1M tokens</div>
              <div className="text-xs text-muted-foreground">($0.000005 each)</div>
            </div>
            <div>
              <span className="text-muted-foreground">Output tokens</span>
              <div className="font-mono font-semibold">$15.00 / 1M tokens</div>
              <div className="text-xs text-muted-foreground">($0.000015 each)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
