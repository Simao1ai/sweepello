import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, MapPin, Clock, Plus, Star, Navigation, X, AlertTriangle, CheckCircle2, UserCheck } from "lucide-react";
import type { ServiceRequest, Review } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  broadcasting: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_route: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Finding Cleaners",
  broadcasting: "Matching in Progress",
  confirmed: "Cleaner Assigned",
  in_route: "Cleaner On The Way 🚗",
  in_progress: "Cleaning in Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const CANCELABLE = ["pending", "broadcasting", "confirmed"];

function hoursUntil(date: string | Date) {
  return (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60);
}

export default function MyBookings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [cancelTarget, setCancelTarget] = useState<ServiceRequest | null>(null);

  const { data: bookings, isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests/mine"],
  });

  const { data: myReviews } = useQuery<Review[]>({
    queryKey: ["/api/reviews/mine"],
  });

  const reviewsByJobId = (myReviews || []).reduce<Record<string, Review>>((acc, r) => {
    if (r.jobId) acc[r.jobId] = r;
    return acc;
  }, {});

  const unratedCompleted = (bookings || []).filter(
    b => b.status === "completed" && b.jobId && !reviewsByJobId[b.jobId]
  );

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/service-requests/${id}/cancel`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to cancel");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/mine"] });
      setCancelTarget(null);
      toast({
        title: data.cancellationFeeCharged ? "Booking cancelled — $50 fee charged" : "Booking cancelled",
        description: data.message,
        variant: data.cancellationFeeCharged ? "destructive" : "default",
      });
    },
    onError: (err: Error) => {
      setCancelTarget(null);
      toast({ title: "Could not cancel", description: err.message, variant: "destructive" });
    },
  });

  const feeApplies = cancelTarget
    ? hoursUntil(cancelTarget.requestedDate) <= 24 && hoursUntil(cancelTarget.requestedDate) > 0
    : false;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">My Bookings</h1>
          <p className="text-muted-foreground text-sm">Track your cleaning requests</p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/request-service")} data-testid="button-new-request">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      {unratedCompleted.length > 0 && (
        <div className="mb-6 space-y-3" data-testid="section-rate-prompts">
          {unratedCompleted.map(booking => (
            <div
              key={booking.id}
              className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center justify-between gap-4"
              data-testid={`rate-prompt-${booking.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold">How was your cleaning?</p>
                  <p className="text-xs text-muted-foreground">{booking.propertyAddress}</p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                onClick={() => navigate(`/rate/${booking.id}`)}
                data-testid={`button-rate-now-${booking.id}`}
              >
                Rate Now
              </Button>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !bookings?.length ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Request your first cleaning service to get started!
            </p>
            <Button onClick={() => navigate("/request-service")} data-testid="button-first-request">
              Request a Cleaning
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).map(booking => {
            const review = booking.jobId ? reviewsByJobId[booking.jobId] : null;
            const canCancel = CANCELABLE.includes(booking.status);
            const hours = hoursUntil(booking.requestedDate);
            return (
              <Card key={booking.id} className="hover:shadow-md transition-shadow" data-testid={`card-booking-${booking.id}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge className={statusColors[booking.status] || "bg-muted"}>
                          {statusLabels[booking.status] || booking.status}
                        </Badge>
                        {booking.estimatedPrice && (
                          <span className="text-sm font-medium text-primary" data-testid={`text-price-${booking.id}`}>
                            ${Number(booking.estimatedPrice).toFixed(0)}
                          </span>
                        )}
                        {(booking as any).cancellationFeeCharged && (
                          <Badge variant="destructive" className="text-xs">$50 Fee Charged</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span data-testid={`text-address-${booking.id}`}>{booking.propertyAddress}</span>
                        {booking.city && <span className="text-muted-foreground">- {booking.city}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(booking.requestedDate).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric"
                          })}
                        </div>
                        {(booking as any).confirmedArrivalTime ? (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Arrives at {(() => {
                              const [h, m] = (booking as any).confirmedArrivalTime.split(":").map(Number);
                              const isPM = h >= 12;
                              const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
                              return `${h12}:${String(m).padStart(2, "0")} ${isPM ? "PM" : "AM"}`;
                            })()}
                          </div>
                        ) : booking.preferredTime ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {booking.preferredTime.charAt(0).toUpperCase() + booking.preferredTime.slice(1)}
                          </div>
                        ) : null}
                        <span className="text-xs">
                          {booking.bedrooms}BR / {booking.bathrooms}BA
                        </span>
                        {canCancel && hours > 0 && hours <= 24 && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> $50 fee if cancelled now
                          </span>
                        )}
                      </div>
                      {/* Cleaner info card — shown once a cleaner is assigned */}
                      {(booking as any).assignedCleanerName && ["confirmed", "in_route", "in_progress", "completed"].includes(booking.status) && (
                        <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-sm">
                          <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-medium text-blue-800 dark:text-blue-300">
                            {(booking as any).assignedCleanerName}
                          </span>
                          {(booking as any).assignedCleanerRating != null && (
                            <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-medium">{Number((booking as any).assignedCleanerRating).toFixed(1)}</span>
                            </span>
                          )}
                          {(booking as any).assignedCleanerTotalJobs > 0 && (
                            <span className="text-muted-foreground text-xs">
                              · {(booking as any).assignedCleanerTotalJobs} job{(booking as any).assignedCleanerTotalJobs !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      {(booking.status === "in_route" || booking.status === "in_progress") && (
                        <Button
                          size="sm"
                          className="gap-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                          onClick={() => navigate(`/tracking/${booking.id}`)}
                          data-testid={`button-track-${booking.id}`}
                        >
                          <Navigation className="h-3.5 w-3.5" /> Track
                        </Button>
                      )}
                      {booking.status === "completed" && booking.jobId && !review && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => navigate(`/rate/${booking.id}`)}
                          data-testid={`button-rate-${booking.id}`}
                        >
                          <Star className="h-3.5 w-3.5" /> Rate Service
                        </Button>
                      )}
                      {booking.status === "completed" && review && (
                        <div className="flex items-center gap-1" data-testid={`rated-display-${booking.id}`}>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground ml-1">Rated</span>
                        </div>
                      )}
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setCancelTarget(booking)}
                          data-testid={`button-cancel-${booking.id}`}
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {feeApplies ? (
                <><AlertTriangle className="h-5 w-5 text-amber-500" /> Cancellation Fee Applies</>
              ) : (
                "Cancel this booking?"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              You're about to cancel your cleaning at{" "}
              <strong>{cancelTarget?.propertyAddress}</strong> on{" "}
              <strong>
                {cancelTarget && new Date(cancelTarget.requestedDate).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric"
                })}
              </strong>.
            </AlertDialogDescription>
            {feeApplies ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm font-medium text-amber-700 dark:text-amber-400">
                ⚠️ Since this service is within 24 hours, a <strong>$50 cancellation fee</strong> will be charged to your saved card per our cancellation policy.
              </div>
            ) : (
              <p className="text-sm text-green-700 dark:text-green-400">
                ✅ No cancellation fee — you're cancelling more than 24 hours before the service.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-no">Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
              className={feeApplies ? "bg-red-600 hover:bg-red-700" : ""}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-dialog-confirm"
            >
              {cancelMutation.isPending ? "Cancelling..." : feeApplies ? "Cancel & Pay $50 Fee" : "Yes, Cancel Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
