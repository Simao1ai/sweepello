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
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Star,
  Briefcase,
  Clock,
} from "lucide-react";
import type { Job } from "@shared/schema";

interface ContractorProfile {
  id: string;
  name: string;
  rating: string;
  totalJobs: number;
  totalRevenue: string;
  onTimePercentage: string;
}

const COLORS = [
  "hsl(160, 60%, 45%)",
  "hsl(210, 70%, 50%)",
  "hsl(260, 60%, 55%)",
  "hsl(30, 70%, 50%)",
  "hsl(340, 65%, 50%)",
];

export default function ContractorEarnings() {
  const { data: profile, isLoading: profileLoading } = useQuery<ContractorProfile>({
    queryKey: ["/api/contractor/profile"],
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/contractor/jobs"],
  });

  const isLoading = profileLoading || jobsLoading;
  const completedJobs = jobs?.filter(j => j.status === "completed") || [];
  const allJobs = jobs || [];

  const totalEarnings = completedJobs.reduce((sum, j) => sum + Number(j.cleanerPay || 0), 0);
  const avgPerJob = completedJobs.length > 0 ? totalEarnings / completedJobs.length : 0;

  const now = new Date();
  const thisMonthJobs = completedJobs.filter(j => {
    const d = new Date(j.scheduledDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthEarnings = thisMonthJobs.reduce((sum, j) => sum + Number(j.cleanerPay || 0), 0);

  const lastMonthJobs = completedJobs.filter(j => {
    const d = new Date(j.scheduledDate);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
  });
  const lastMonthEarnings = lastMonthJobs.reduce((sum, j) => sum + Number(j.cleanerPay || 0), 0);
  const growthPct = lastMonthEarnings > 0
    ? (((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100).toFixed(0)
    : null;

  const earningsByMonth = (() => {
    if (!completedJobs.length) return [];
    const months: Record<string, { earnings: number; jobs: number }> = {};
    completedJobs.forEach(j => {
      const month = new Date(j.scheduledDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!months[month]) months[month] = { earnings: 0, jobs: 0 };
      months[month].earnings += Number(j.cleanerPay || 0);
      months[month].jobs += 1;
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  })();

  const earningsByDay = (() => {
    if (!completedJobs.length) return [];
    const days: Record<string, number> = {
      Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0,
    };
    const dayCounts: Record<string, number> = { ...days };
    completedJobs.forEach(j => {
      const day = new Date(j.scheduledDate).toLocaleDateString("en-US", { weekday: "short" });
      days[day] += Number(j.cleanerPay || 0);
      dayCounts[day] += 1;
    });
    return Object.entries(days).map(([day, total]) => ({
      day,
      earnings: total,
      count: dayCounts[day],
    }));
  })();

  const statusBreakdown = (() => {
    if (!allJobs.length) return [];
    const counts: Record<string, number> = {};
    allJobs.forEach(j => {
      const label = j.status === "in_progress" ? "In Progress" : j.status.charAt(0).toUpperCase() + j.status.slice(1);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Earnings & Analytics</h1>
        <p className="text-muted-foreground">Track your performance and earnings</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-20" /></CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-month-earnings">
                  ${thisMonthEarnings.toLocaleString()}
                </div>
                {growthPct && (
                  <p className={`text-xs mt-1 ${Number(growthPct) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {Number(growthPct) >= 0 ? "+" : ""}{growthPct}% vs last month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-earnings">
                  ${totalEarnings.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{completedJobs.length} completed jobs</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Per Job</CardTitle>
                <Briefcase className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-earnings">${avgPerJob.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground mt-1">across all completed jobs</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
                <Star className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-rating">
                  {profile ? `${Number(profile.rating).toFixed(1)}/5` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile ? `${Number(profile.onTimePercentage).toFixed(0)}% on-time rate` : "No data"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Monthly Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : earningsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={earningsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Earnings"]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="earnings" stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={{ r: 4 }} name="Earnings ($)" />
                  <Line type="monotone" dataKey="jobs" stroke="hsl(210, 70%, 50%)" strokeWidth={2} dot={{ r: 4 }} name="Jobs" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Complete jobs to see your earnings trend
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Busiest Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : earningsByDay.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={earningsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="earnings" fill="hsl(160, 60%, 45%)" name="Earnings ($)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No job data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Job Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : statusBreakdown.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusBreakdown.map((_, index) => (
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
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No jobs to display
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
