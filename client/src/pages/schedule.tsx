import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, MapPin, User, Clock, DollarSign } from "lucide-react";
import type { Cleaner, ServiceRequest } from "@shared/schema";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  address: string;
  status: string;
  cleanerName: string;
  cleanerId: string | null;
  price: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/80 hover:bg-yellow-500",
  assigned: "bg-blue-500/80 hover:bg-blue-500",
  in_progress: "bg-purple-500/80 hover:bg-purple-500",
  completed: "bg-green-500/80 hover:bg-green-500",
  cancelled: "bg-red-500/80 hover:bg-red-500",
};

export default function Schedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedCleaner, setSelectedCleaner] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: events, isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
  });

  const { data: cleaners } = useQuery<Cleaner[]>({
    queryKey: ["/api/cleaners"],
  });

  const { data: serviceRequests } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const assignMutation = useMutation({
    mutationFn: async ({ requestId, cleanerId }: { requestId: string; cleanerId: string }) => {
      const res = await apiRequest("PATCH", `/api/service-requests/${requestId}`, {
        assignedCleanerId: cleanerId,
        status: "confirmed",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cleaner assigned", description: "Job created and cleaner notified." });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setDialogOpen(false);
      setSelectedRequest(null);
      setSelectedCleaner("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) => {
    if (!events) return [];
    return events.filter(e => {
      const d = new Date(e.start);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const getRequestsForDay = (day: number) => {
    if (!serviceRequests) return [];
    return serviceRequests.filter(r => {
      if (r.status !== "pending") return false;
      const d = new Date(r.requestedDate);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const pendingRequests = serviceRequests?.filter(r => r.status === "pending") || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Schedule</h1>
          <p className="text-muted-foreground text-sm">Manage cleaner assignments and availability</p>
        </div>
        {pendingRequests.length > 0 && (
          <Badge variant="destructive" className="text-sm" data-testid="badge-pending-count">
            {pendingRequests.length} Pending Request{pendingRequests.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle data-testid="text-month-title">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
                {days.map((day, idx) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const dayRequests = day ? getRequestsForDay(day) : [];
                  const isToday = day &&
                    new Date().getDate() === day &&
                    new Date().getMonth() === month &&
                    new Date().getFullYear() === year;

                  return (
                    <div key={idx} className={`bg-background min-h-[80px] p-1 ${!day ? "bg-muted/30" : ""}`}>
                      {day && (
                        <>
                          <span className={`text-xs inline-flex items-center justify-center rounded-full w-6 h-6 ${
                            isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                          }`}>
                            {day}
                          </span>
                          <div className="space-y-0.5 mt-0.5">
                            {dayRequests.map(r => (
                              <button
                                key={r.id}
                                onClick={() => { setSelectedRequest(r); setDialogOpen(true); }}
                                className="block w-full text-left rounded px-1 py-0.5 text-[10px] bg-orange-500/80 text-white truncate hover:bg-orange-500 cursor-pointer"
                                data-testid={`event-request-${r.id}`}
                              >
                                NEW: {r.propertyAddress.substring(0, 15)}
                              </button>
                            ))}
                            {dayEvents.map(e => (
                              <div
                                key={e.id}
                                className={`rounded px-1 py-0.5 text-[10px] text-white truncate ${statusColors[e.status] || "bg-gray-500"}`}
                                title={`${e.cleanerName} - ${e.address}`}
                                data-testid={`event-job-${e.id}`}
                              >
                                {e.cleanerName}: {e.address.substring(0, 12)}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
              ) : (
                pendingRequests.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRequest(r); setDialogOpen(true); }}
                    className="block w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                    data-testid={`card-pending-request-${r.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.propertyAddress}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.requestedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {r.preferredTime && ` - ${r.preferredTime}`}
                        </p>
                        {r.estimatedPrice && (
                          <p className="text-xs text-primary mt-0.5">${Number(r.estimatedPrice).toFixed(0)}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "New Request", color: "bg-orange-500" },
                { label: "Pending", color: "bg-yellow-500" },
                { label: "Assigned", color: "bg-blue-500" },
                { label: "In Progress", color: "bg-purple-500" },
                { label: "Completed", color: "bg-green-500" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${l.color}`} />
                  <span className="text-xs">{l.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Cleaner to Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedRequest.propertyAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(selectedRequest.requestedDate).toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric"
                    })}
                    {selectedRequest.preferredTime && ` - ${selectedRequest.preferredTime}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Est. ${Number(selectedRequest.estimatedPrice || 0).toFixed(0)}</span>
                </div>
                {selectedRequest.specialInstructions && (
                  <p className="text-muted-foreground italic">"{selectedRequest.specialInstructions}"</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Cleaner</label>
                <Select value={selectedCleaner} onValueChange={setSelectedCleaner}>
                  <SelectTrigger data-testid="select-cleaner-assign">
                    <SelectValue placeholder="Choose a cleaner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cleaners?.filter(c => c.status === "active").map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          {c.name} - {c.rating} stars
                          {c.serviceArea && ` (${c.serviceArea})`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                disabled={!selectedCleaner || assignMutation.isPending}
                onClick={() => assignMutation.mutate({
                  requestId: selectedRequest.id,
                  cleanerId: selectedCleaner,
                })}
                data-testid="button-confirm-assign"
              >
                {assignMutation.isPending ? "Assigning..." : "Assign & Create Job"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
