import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Plus, Star } from "lucide-react";
import type { ServiceRequest, Review } from "@shared/schema";

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
  broadcasting: "Matching in Progress",
  confirmed: "Cleaner Assigned",
  in_progress: "Cleaning in Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function MyBookings() {
  const [, navigate] = useLocation();

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
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span data-testid={`text-address-${booking.id}`}>{booking.propertyAddress}</span>
                        {booking.city && <span className="text-muted-foreground">- {booking.city}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(booking.requestedDate).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric"
                          })}
                        </div>
                        {booking.preferredTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {booking.preferredTime.charAt(0).toUpperCase() + booking.preferredTime.slice(1)}
                          </div>
                        )}
                        <span className="text-xs">
                          {booking.bedrooms}BR / {booking.bathrooms}BA
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
