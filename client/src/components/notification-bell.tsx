import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Check, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@shared/schema";
import { useState } from "react";

const TYPE_LABELS: Record<string, string> = {
  job_assigned: "Job Confirmed",
  job_offer: "New Job Offer",
  job_updated: "Job Update",
  job_cancelled: "Cancellation",
  rate_prompt: "Rate Your Cleaner",
  review_received: "New Rating",
  contractor_pending: "Contractor Pending",
  low_rating: "Rating Alert",
};

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/notifications/read-all");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const acceptMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await apiRequest("POST", `/api/contractor/offers/${offerId}/accept`);
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/jobs"] });
      toast({ title: "Job Accepted!", description: "Check My Jobs for details." });
      setOpen(false);
    },
    onError: (err: Error) => toast({ title: "Couldn't accept", description: err.message, variant: "destructive" }),
  });

  const declineMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await apiRequest("POST", `/api/contractor/offers/${offerId}/decline`);
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Offer declined" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.type === "job_offer") {
      setOpen(false);
      navigate("/contractor/notifications");
    }
  };

  const recent = notifications.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications-bell"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" data-testid="popover-notifications">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            recent.map((n) => {
              const isJobOffer = n.type === "job_offer";
              const offerPending = isJobOffer && (n as any).offerStatus === "offered";
              return (
                <div
                  key={n.id}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    !n.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                  } ${isJobOffer ? "cursor-pointer hover:bg-muted/50" : ""}`}
                  onClick={() => handleClick(n)}
                  data-testid={`notification-item-${n.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {isJobOffer && <Zap className="h-3 w-3 text-primary flex-shrink-0" />}
                        {!n.isRead && !isJobOffer && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <p className="text-xs font-semibold truncate">
                          {TYPE_LABELS[n.type] || n.title}
                        </p>
                        {!n.isRead && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">New</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                      {timeAgo((n as any).createdAt)}
                    </span>
                  </div>
                  {offerPending && n.jobOfferId && (
                    <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1 gap-1"
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                        onClick={() => acceptMutation.mutate(n.jobOfferId!)}
                        data-testid={`button-accept-offer-${n.id}`}
                      >
                        <Check className="h-3 w-3" />
                        {acceptMutation.isPending ? "Accepting..." : "Accept"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1 gap-1 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                        onClick={() => declineMutation.mutate(n.jobOfferId!)}
                        data-testid={`button-decline-offer-${n.id}`}
                      >
                        <X className="h-3 w-3" />
                        {declineMutation.isPending ? "Declining..." : "Decline"}
                      </Button>
                    </div>
                  )}
                  {isJobOffer && !offerPending && (
                    <p className="text-[10px] text-muted-foreground mt-1 italic">
                      {(n as any).offerStatus === "accepted" ? "✓ Accepted" :
                       (n as any).offerStatus === "declined" ? "✗ Declined" :
                       (n as any).offerStatus === "expired" ? "Expired" : "Tap to view"}
                    </p>
                  )}
                  {isJobOffer && !(n as any).offerStatus && (
                    <p className="text-[10px] text-primary mt-1">Tap to view and respond →</p>
                  )}
                </div>
              );
            })
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <button
              className="text-xs text-primary hover:underline w-full text-center"
              onClick={() => { setOpen(false); navigate("/contractor/notifications"); }}
              data-testid="button-view-all-notifications"
            >
              View all notifications
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
