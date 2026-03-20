import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
        <div className="max-h-[360px] overflow-y-auto divide-y">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            recent.map((n) => (
              <button
                key={n.id}
                className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                  !n.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                }`}
                onClick={() => {
                  if (!n.isRead) markReadMutation.mutate(n.id);
                }}
                data-testid={`notification-item-${n.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {!n.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <p className="text-xs font-semibold truncate">
                        {TYPE_LABELS[n.type] || n.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                    {timeAgo((n as any).createdAt)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
