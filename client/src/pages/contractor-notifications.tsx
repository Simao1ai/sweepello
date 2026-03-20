import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellOff, CheckCheck, Check, X, Zap, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@shared/schema";

const typeLabels: Record<string, string> = {
  job_assigned: "Job Confirmed",
  job_offer: "Job Offer",
  job_updated: "Job Update",
  job_cancelled: "Cancellation",
};

export default function ContractorNotifications() {
  const { toast } = useToast();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/notifications/read-all");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await apiRequest("POST", `/api/contractor/offers/${offerId}/accept`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/offers"] });
      toast({ title: "Job Accepted!", description: "Check your Jobs page for details." });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't accept job", description: err.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await apiRequest("POST", `/api/contractor/offers/${offerId}/decline`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/offers"] });
      toast({ title: "Offer declined" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const sorted = [...(notifications || [])].sort(
    (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="h-4 w-4" /> Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !sorted.length ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No notifications</h3>
            <p className="text-sm text-muted-foreground">
              You'll receive notifications here when new jobs are available in your area.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(notification => {
            const isJobOffer = notification.type === "job_offer";
            const isPreferred = notification.title?.includes("Preferred") || notification.title?.includes("Priority");
            const offerPending = isJobOffer && (notification as any).offerStatus === "offered";

            return (
              <Card
                key={notification.id}
                className={`transition-all ${
                  !notification.isRead
                    ? isPreferred
                      ? "border-yellow-400/60 bg-yellow-50/30 dark:bg-yellow-950/10"
                      : "border-primary/40 bg-primary/5"
                    : "opacity-75"
                }`}
                data-testid={`card-notification-${notification.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`mt-1 p-1.5 rounded-full ${
                        isPreferred ? "bg-yellow-100 dark:bg-yellow-900/30" :
                        !notification.isRead ? "bg-primary/10" : "bg-muted"
                      }`}>
                        {isPreferred ? (
                          <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        ) : isJobOffer ? (
                          <Zap className="h-4 w-4 text-primary" />
                        ) : (
                          <Bell className={`h-4 w-4 ${!notification.isRead ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm" data-testid={`text-title-${notification.id}`}>
                            {notification.title}
                          </span>
                          <Badge variant={isJobOffer ? "default" : "secondary"} className="text-xs">
                            {typeLabels[notification.type] || notification.type}
                          </Badge>
                          {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-primary" data-testid={`badge-unread-${notification.id}`} />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-message-${notification.id}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt!).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {offerPending && notification.jobOfferId && (
                        <>
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => acceptMutation.mutate(notification.jobOfferId!)}
                            disabled={acceptMutation.isPending || declineMutation.isPending}
                            data-testid={`button-accept-${notification.id}`}
                          >
                            <Check className="h-3 w-3" /> Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              declineMutation.mutate(notification.jobOfferId!);
                              markReadMutation.mutate(notification.id);
                            }}
                            disabled={acceptMutation.isPending || declineMutation.isPending}
                            data-testid={`button-decline-${notification.id}`}
                          >
                            <X className="h-3 w-3" /> Decline
                          </Button>
                        </>
                      )}
                      {isJobOffer && !offerPending && (notification as any).offerStatus && (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            (notification as any).offerStatus === "accepted"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : (notification as any).offerStatus === "declined"
                              ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                              : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          }`}
                          data-testid={`badge-offer-status-${notification.id}`}
                        >
                          {(notification as any).offerStatus === "accepted" ? "Accepted" :
                           (notification as any).offerStatus === "declined" ? "Declined" : "Expired"}
                        </Badge>
                      )}
                      {!isJobOffer && !notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markReadMutation.mutate(notification.id)}
                          disabled={markReadMutation.isPending}
                          data-testid={`button-read-${notification.id}`}
                        >
                          Mark Read
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
    </div>
  );
}
