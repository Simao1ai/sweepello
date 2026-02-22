import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { TrendingUp, PieChartIcon, BarChart3, Activity } from "lucide-react";
import type { Job, Cleaner } from "@shared/schema";

const COLORS = [
  "hsl(210, 82%, 45%)",
  "hsl(195, 78%, 42%)",
  "hsl(225, 75%, 40%)",
  "hsl(180, 70%, 38%)",
  "hsl(240, 68%, 44%)",
];

export default function Analytics() {
  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });
  const { data: cleaners, isLoading: cleanersLoading } = useQuery<Cleaner[]>({
    queryKey: ["/api/cleaners"],
  });

  const isLoading = jobsLoading || cleanersLoading;

  const statusData = (() => {
    if (!jobs) return [];
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      const label = j.status.replace("_", " ");
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const revenueByMonth = (() => {
    if (!jobs) return [];
    const months: Record<string, { revenue: number; profit: number; jobs: number }> = {};
    jobs.forEach((j) => {
      const month = new Date(j.scheduledDate).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      if (!months[month]) months[month] = { revenue: 0, profit: 0, jobs: 0 };
      months[month].revenue += Number(j.price);
      months[month].profit += Number(j.profit || 0);
      months[month].jobs += 1;
    });
    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
    }));
  })();

  const cleanerPerformance = cleaners
    ?.filter((c) => c.status === "active")
    .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
    .slice(0, 8)
    .map((c) => ({
      name: c.name.split(" ")[0],
      revenue: Number(c.totalRevenue),
      jobs: c.totalJobs,
      rating: Number(c.rating),
    })) || [];

  const totalRevenue = jobs?.reduce((sum, j) => sum + Number(j.price), 0) || 0;
  const totalProfit = jobs?.reduce((sum, j) => sum + Number(j.profit || 0), 0) || 0;
  const avgJobValue = jobs?.length ? totalRevenue / jobs.length : 0;
  const completionRate = jobs?.length
    ? ((jobs.filter((j) => j.status === "completed").length / jobs.length) * 100).toFixed(0)
    : "0";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Analytics</h1>
        <p className="text-muted-foreground">Deep dive into your business performance</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">${totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit</CardTitle>
            <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-profit">
              ${totalProfit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Job Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgJobValue.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            <PieChartIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue & Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(210, 82%, 45%)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="hsl(145, 63%, 42%)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No data available yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cleaner Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : cleanerPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cleanerPerformance}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(210, 82%, 45%)" name="Revenue ($)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="jobs" fill="hsl(195, 78%, 42%)" name="Jobs" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
              No cleaner data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
