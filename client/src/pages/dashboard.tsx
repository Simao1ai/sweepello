import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  CalendarCheck,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
} from "lucide-react";
import type { Job, Cleaner } from "@shared/schema";

interface DashboardStats {
  totalRevenue: number;
  totalProfit: number;
  marginPercent: number;
  jobsScheduled: number;
  jobsCompleted: number;
  avgCleanerRating: number;
  pendingPayments: number;
  activeCleaners: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  subtitle?: string;
}) {
  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`text-stat-${title.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
        {(trend || subtitle) && (
          <div className="mt-1 flex items-center gap-1">
            {trend && (
              <>
                {trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-xs font-medium ${trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {trendValue}
                </span>
              </>
            )}
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentJobRow({ job }: { job: Job }) {
  const statusColors: Record<string, string> = {
    completed: "default",
    in_progress: "secondary",
    pending: "outline",
    cancelled: "destructive",
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-md p-3 hover-elevate" data-testid={`row-job-${job.id}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{job.propertyAddress}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(job.scheduledDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={statusColors[job.status] as any || "outline"}>
          {job.status.replace("_", " ")}
        </Badge>
        <span className="text-sm font-semibold text-nowrap">${Number(job.price).toFixed(0)}</span>
      </div>
    </div>
  );
}

function TopCleanerRow({ cleaner, rank }: { cleaner: Cleaner; rank: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md p-3 hover-elevate" data-testid={`row-cleaner-${cleaner.id}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{cleaner.name}</p>
        <p className="text-xs text-muted-foreground">{cleaner.totalJobs} jobs</p>
      </div>
      <div className="flex items-center gap-1">
        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
        <span className="text-sm font-medium">{Number(cleaner.rating).toFixed(1)}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentJobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: cleaners, isLoading: cleanersLoading } = useQuery<Cleaner[]>({
    queryKey: ["/api/cleaners"],
  });

  const topCleaners = cleaners
    ?.filter((c) => c.status === "active")
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, 5);

  const recentJobsList = recentJobs
    ?.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your cleaning dispatch operations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="mt-2 h-3 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Revenue"
              value={`$${(stats?.totalRevenue || 0).toLocaleString()}`}
              icon={DollarSign}
              trend="up"
              trendValue="+12%"
              subtitle="this month"
            />
            <StatCard
              title="Margin"
              value={`${(stats?.marginPercent || 0).toFixed(1)}%`}
              icon={TrendingUp}
              trend="up"
              trendValue="+3%"
              subtitle="vs last month"
            />
            <StatCard
              title="Jobs Scheduled"
              value={String(stats?.jobsScheduled || 0)}
              icon={CalendarCheck}
              subtitle={`${stats?.jobsCompleted || 0} completed`}
            />
            <StatCard
              title="Avg Rating"
              value={Number(stats?.avgCleanerRating || 0).toFixed(1)}
              icon={Star}
              subtitle={`${stats?.activeCleaners || 0} active cleaners`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {jobsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))
            ) : recentJobsList?.length ? (
              recentJobsList.map((job) => <RecentJobRow key={job.id} job={job} />)
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarCheck className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No jobs yet</p>
                <p className="text-xs text-muted-foreground">Create your first job to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-muted-foreground" />
              Top Cleaners
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {cleanersLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : topCleaners?.length ? (
              topCleaners.map((cleaner, idx) => (
                <TopCleanerRow key={cleaner.id} cleaner={cleaner} rank={idx + 1} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No cleaners added</p>
                <p className="text-xs text-muted-foreground">Add cleaners to your team</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-md border border-border p-4 hover-elevate cursor-pointer" data-testid="action-pending-jobs">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Pending Jobs</p>
                <p className="text-xs text-muted-foreground">
                  {recentJobs?.filter((j) => j.status === "pending").length || 0} awaiting assignment
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border p-4 hover-elevate cursor-pointer" data-testid="action-completed-today">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed Today</p>
                <p className="text-xs text-muted-foreground">
                  {recentJobs?.filter((j) => j.status === "completed" && new Date(j.scheduledDate).toDateString() === new Date().toDateString()).length || 0} jobs done
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border p-4 hover-elevate cursor-pointer" data-testid="action-active-cleaners">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Active Cleaners</p>
                <p className="text-xs text-muted-foreground">
                  {cleaners?.filter((c) => c.status === "active").length || 0} on your team
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

