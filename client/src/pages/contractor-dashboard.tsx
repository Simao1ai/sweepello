import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Briefcase,
  Star,
  TrendingUp,
  Calendar,
  MapPin,
  Bell,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { Job, Notification } from "@shared/schema";

interface ContractorProfile {
  id: string;
  name: string;
  rating: string;
  totalJobs: number;
  totalRevenue: string;
  onTimePercentage: string;
  status: string;
}

const statusColors: Record<string, string> = {
  assigned: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export default function ContractorDashboard() {
  const [, navigate] = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery<ContractorProfile>({
    queryKey: ["/api/contractor/profile"],
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/contractor/jobs"],
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const pendingOffers = notifications?.filter(n => n.type === "job_offer" && !n.isRead).length || 0;
  const activeJobs = jobs?.filter(j => j.status === "assigned" || j.status === "in_progress") || [];
  const completedJobs = jobs?.filter(j => j.status === "completed") || [];
  const upcomingJobs = activeJobs
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 4);

  const totalEarnings = jobs?.reduce((sum, j) => sum + Number(j.cleanerPay || 0), 0) || 0;
  const thisMonthJobs = jobs?.filter(j => {
    const d = new Date(j.scheduledDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }) || [];
  const thisMonthEarnings = thisMonthJobs.reduce((sum, j) => sum + Number(j.cleanerPay || 0), 0);

  const isLoading = profileLoading || jobsLoading;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            {profile ? `Welcome back, ${profile.name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">Your contractor overview</p>
        </div>
        {pendingOffers > 0 && (
          <Button
            variant="outline"
            className="gap-2 border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
            onClick={() => navigate("/contractor/notifications")}
            data-testid="button-view-offers"
          >
            <Bell className="h-4 w-4" />
            {pendingOffers} New Offer{pendingOffers > 1 ? "s" : ""}
          </Button>
        )}
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
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-month-earnings">
                  ${thisMonthEarnings.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{thisMonthJobs.length} jobs this month</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-rating">
                  {profile ? Number(profile.rating).toFixed(1) : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile ? `${Number(profile.onTimePercentage).toFixed(0)}% on-time` : "No reviews yet"}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30">
                  <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-jobs">{activeJobs.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Upcoming Jobs
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/contractor/jobs")} data-testid="button-view-all-jobs">
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : upcomingJobs.length > 0 ? (
              upcomingJobs.map(job => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  data-testid={`row-upcoming-${job.id}`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{job.propertyAddress}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(job.scheduledDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                      <Badge className={statusColors[job.status] || "bg-muted"} variant="secondary">
                        {job.status === "in_progress" ? "In Progress" : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    ${Number(job.cleanerPay || 0).toFixed(0)}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming jobs</p>
                <p className="text-xs text-muted-foreground">Check notifications for new offers</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate("/contractor/notifications")}
              data-testid="action-notifications"
            >
              <Bell className={`h-5 w-5 ${pendingOffers > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">Job Offers</p>
                <p className="text-xs text-muted-foreground">
                  {pendingOffers > 0 ? `${pendingOffers} pending offer${pendingOffers > 1 ? "s" : ""}` : "No pending offers"}
                </p>
              </div>
              {pendingOffers > 0 && (
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">{pendingOffers}</Badge>
              )}
            </div>

            <div
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate("/contractor/availability")}
              data-testid="action-availability"
            >
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Update Availability</p>
                <p className="text-xs text-muted-foreground">Set your weekly working hours</p>
              </div>
            </div>

            <div
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate("/contractor/earnings")}
              data-testid="action-earnings"
            >
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">Earnings & Analytics</p>
                <p className="text-xs text-muted-foreground">Track your performance and payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
