import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  MapPin,
  Plus,
  Star,
  Clock,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Sparkles,
  Home,
  MessageCircle,
  Navigation,
  RefreshCw,
  Pause,
} from "lucide-react";
import type { ServiceRequest, RecurringBooking } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import LiveMap from "@/components/live-map";
import JobChat from "@/components/job-chat";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  broadcasting: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Finding Cleaners",
  broadcasting: "Matching",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface CleanerLocation {
  cleanerId: string;
  name: string;
  lat: number;
  lng: number;
}

export default function ClientDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [cleanerLocations, setCleanerLocations] = useState<Map<string, CleanerLocation>>(new Map());
  const [activeChatJobId, setActiveChatJobId] = useState<string | null>(null);

  const { data: bookings, isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests/mine"],
  });

  const { data: profile } = useQuery<any>({ queryKey: ["/api/profile"] });

  const { data: recurringBookings } = useQuery<RecurringBooking[]>({
    queryKey: ["/api/recurring-bookings"],
  });

  const activeRecurring = recurringBookings?.filter(r => r.isActive) ?? [];

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === "cleaner_location" || msg.type === "cleaner_online") {
      setCleanerLocations(prev => {
        const next = new Map(prev);
        next.set(msg.cleanerId, { cleanerId: msg.cleanerId, name: msg.name || "Cleaner", lat: msg.lat, lng: msg.lng });
        return next;
      });
    }
  }, []);

  useWebSocket(handleWsMessage);

  const activeBookings = bookings?.filter(b =>
    b.status !== "completed" && b.status !== "cancelled"
  ) || [];
  const completedBookings = bookings?.filter(b => b.status === "completed") || [];
  const totalSpent = bookings?.reduce((sum, b) => sum + Number(b.estimatedPrice || 0), 0) || 0;

  const upcomingBookings = activeBookings
    .sort((a, b) => new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime())
    .slice(0, 4);

  const inProgressBooking = activeBookings.find(b => b.status === "in_progress");
  const mapMarkers = Array.from(cleanerLocations.values()).map(cl => ({
    cleanerId: cl.cleanerId,
    name: cl.name,
    lat: cl.lat,
    lng: cl.lng,
    isOnline: true,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Dashboard</h1>
          <p className="text-muted-foreground">Your cleaning services overview</p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/request-service")} data-testid="button-new-request">
          <Plus className="h-4 w-4" /> Book a Cleaning
        </Button>
      </div>

      {inProgressBooking && mapMarkers.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-purple-700 dark:text-purple-400">
              <Navigation className="h-4 w-4 animate-pulse" />
              Cleaner En Route – Live Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LiveMap height="220px" markers={mapMarkers} className="border-purple-200 dark:border-purple-800" />
          </CardContent>
        </Card>
      )}

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
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Bookings</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-bookings">{activeBookings.length}</div>
                <p className="text-xs text-muted-foreground mt-1">in progress or scheduled</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-completed">{completedBookings.length}</div>
                <p className="text-xs text-muted-foreground mt-1">cleanings done</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30">
                  <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-spent">${totalSpent.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">all time</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-bookings">{bookings?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">since you joined</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Upcoming Cleanings
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/my-bookings")} data-testid="button-view-bookings">
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : upcomingBookings.length > 0 ? (
              upcomingBookings.map(booking => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  data-testid={`row-booking-${booking.id}`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{booking.propertyAddress}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(booking.requestedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                      <Badge className={statusColors[booking.status] || "bg-muted"} variant="secondary">
                        {statusLabels[booking.status] || booking.status}
                      </Badge>
                      {booking.isOnDemand && (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]">⚡ On-Demand</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {booking.estimatedPrice && (
                      <span className="text-sm font-semibold">${Number(booking.estimatedPrice).toFixed(0)}</span>
                    )}
                    {booking.jobId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setActiveChatJobId(activeChatJobId === booking.jobId ? null : booking.jobId!)}
                        data-testid={`button-chat-booking-${booking.id}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Home className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming cleanings</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={() => navigate("/request-service")}
                  data-testid="button-book-first"
                >
                  <Plus className="h-3 w-3" /> Book Your First Cleaning
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-muted-foreground" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate("/request-service")}
              data-testid="action-book-cleaning"
            >
              <Plus className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Book a Cleaning</p>
                <p className="text-xs text-muted-foreground">Schedule a new cleaning service</p>
              </div>
            </div>

            <div
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate("/my-bookings")}
              data-testid="action-my-bookings"
            >
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">My Bookings</p>
                <p className="text-xs text-muted-foreground">View all your cleaning requests</p>
              </div>
            </div>

            {completedBookings.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/30 cursor-pointer transition-colors" data-testid="action-rate">
                <Star className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Rate a Service</p>
                  <p className="text-xs text-muted-foreground">Leave feedback for your cleaner</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(activeRecurring.length > 0 || recurringBookings === undefined) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4 text-primary" />
              My Recurring Bookings
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/my-bookings")} data-testid="button-manage-recurring">
              Manage <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recurringBookings === undefined ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : activeRecurring.slice(0, 3).map(rb => (
              <div
                key={rb.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                data-testid={`row-recurring-${rb.id}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{rb.propertyAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {rb.frequency === "biweekly" ? "Every 2 weeks" : rb.frequency === "weekly" ? "Weekly" : "Monthly"}
                    </Badge>
                    {rb.nextServiceDate && (
                      <span>Next: {new Date(rb.nextServiceDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {rb.isActive ? (
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 text-[10px]">Active</Badge>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground text-[10px]" variant="secondary">
                      <Pause className="h-2.5 w-2.5 mr-1" /> Paused
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {activeRecurring.length === 0 && recurringBookings !== undefined && (
              <p className="text-sm text-muted-foreground text-center py-4">No active recurring schedules.</p>
            )}
            {recurringBookings && recurringBookings.filter(r => r.isActive).length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                + {recurringBookings.filter(r => r.isActive).length - 3} more —{" "}
                <button className="underline" onClick={() => navigate("/my-bookings")} data-testid="button-view-all-recurring">view all</button>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeChatJobId && user && (
        <JobChat
          jobId={activeChatJobId}
          currentUserId={user.id}
          currentUserRole="client"
          currentUserName={profile?.name || "Client"}
          otherPartyName="Your Cleaner"
        />
      )}
    </div>
  );
}
