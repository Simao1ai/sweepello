import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, MapPin, DollarSign, PlayCircle, CheckCircle2, Star, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import JobChat from "@/components/job-chat";
import type { Job } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  assigned: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface RatingModalState {
  open: boolean;
  jobId: string | null;
  address: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-8 w-8 transition-colors ${n <= value ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-300"}`}
          data-testid={`star-${n}`}
        >
          <Star className="h-full w-full fill-current" />
        </button>
      ))}
    </div>
  );
}

export default function ContractorJobs() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [ratingModal, setRatingModal] = useState<RatingModalState>({ open: false, jobId: null, address: "" });
  const [clientRating, setClientRating] = useState(5);
  const [clientRatingNote, setClientRatingNote] = useState("");
  const [activeChatJobId, setActiveChatJobId] = useState<string | null>(null);

  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/contractor/jobs"],
  });

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/contractor/profile"],
  });

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === "job_status_update") {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/jobs"] });
    }
  }, []);

  useWebSocket(handleWsMessage);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/contractor/jobs/${jobId}/status`, { status });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/jobs"] });
      toast({ title: "Job status updated" });
      if (vars.status === "completed") {
        const job = jobs?.find(j => j.id === vars.jobId);
        if (job) {
          setClientRating(5);
          setClientRatingNote("");
          setRatingModal({ open: true, jobId: job.id, address: job.propertyAddress });
        }
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rateClientMutation = useMutation({
    mutationFn: async ({ jobId, rating, note }: { jobId: string; rating: number; note: string }) => {
      const res = await apiRequest("POST", `/api/contractor/jobs/${jobId}/rate-client`, { rating, note });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Thanks for your feedback!", description: "Your rating helps us match better clients." });
      setRatingModal({ open: false, jobId: null, address: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/jobs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error submitting rating", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmitRating = () => {
    if (!ratingModal.jobId) return;
    rateClientMutation.mutate({ jobId: ratingModal.jobId, rating: clientRating, note: clientRatingNote });
  };

  const activeJobs = jobs?.filter(j => j.status !== "completed" && j.status !== "cancelled") || [];
  const completedJobs = jobs?.filter(j => j.status === "completed") || [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Jobs</h1>
        <p className="text-muted-foreground text-sm">View and manage your assigned cleaning jobs</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : !jobs?.length ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No jobs assigned</h3>
            <p className="text-sm text-muted-foreground">
              You'll see your assigned cleaning jobs here once they're scheduled.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {activeJobs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-active-header">
                Active Jobs ({activeJobs.length})
              </h2>
              <div className="space-y-4">
                {activeJobs.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()).map(job => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow" data-testid={`card-job-${job.id}`}>
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <Badge className={statusColors[job.status] || "bg-muted"}>
                              {statusLabels[job.status] || job.status}
                            </Badge>
                            <span className="text-sm font-medium text-primary" data-testid={`text-pay-${job.id}`}>
                              <DollarSign className="h-3.5 w-3.5 inline" />
                              {Number(job.cleanerPay || 0).toFixed(0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-address-${job.id}`}>{job.propertyAddress}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(job.scheduledDate).toLocaleDateString("en-US", {
                                weekday: "short", month: "short", day: "numeric"
                              })}
                            </div>
                          </div>
                          {job.notes && (
                            <p className="text-xs text-muted-foreground mt-1">Note: {job.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {job.status === "assigned" && (
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => updateStatusMutation.mutate({ jobId: job.id, status: "in_progress" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-start-${job.id}`}
                            >
                              <PlayCircle className="h-3.5 w-3.5" /> Start
                            </Button>
                          )}
                          {job.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => updateStatusMutation.mutate({ jobId: job.id, status: "completed" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-complete-${job.id}`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() => setActiveChatJobId(activeChatJobId === job.id ? null : job.id)}
                            data-testid={`button-chat-${job.id}`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Chat
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completedJobs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-completed-header">
                Completed ({completedJobs.length})
              </h2>
              <div className="space-y-3">
                {completedJobs.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).map(job => (
                  <Card key={job.id} className="opacity-75" data-testid={`card-job-${job.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={statusColors.completed}>Completed</Badge>
                            <span className="text-sm text-muted-foreground">{job.propertyAddress}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
                            <span>${Number(job.cleanerPay || 0).toFixed(0)} earned</span>
                            {job.clientRating && (
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Star className="h-3 w-3 fill-current" /> {job.clientRating}/5 client rated
                              </span>
                            )}
                          </div>
                        </div>
                        {!job.clientRating && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs"
                            onClick={() => {
                              setClientRating(5);
                              setClientRatingNote("");
                              setRatingModal({ open: true, jobId: job.id, address: job.propertyAddress });
                            }}
                            data-testid={`button-rate-client-${job.id}`}
                          >
                            <Star className="h-3 w-3" /> Rate Client
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={ratingModal.open} onOpenChange={(open) => !open && setRatingModal(prev => ({ ...prev, open: false }))}>
        <DialogContent data-testid="dialog-rate-client">
          <DialogHeader>
            <DialogTitle>Rate this property & client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              How was working at <strong>{ratingModal.address}</strong>? Your feedback helps us match you with better jobs.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Overall Experience</p>
              <StarRating value={clientRating} onChange={setClientRating} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Notes (optional)</p>
              <Textarea
                value={clientRatingNote}
                onChange={(e) => setClientRatingNote(e.target.value)}
                placeholder="Was the property clean and organized? Easy access? Good communication?"
                className="resize-none h-20"
                data-testid="input-client-rating-note"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRatingModal(prev => ({ ...prev, open: false }))} data-testid="button-skip-rating">
              Skip
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={rateClientMutation.isPending}
              data-testid="button-submit-client-rating"
            >
              Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeChatJobId && user && (
        <JobChat
          jobId={activeChatJobId}
          currentUserId={user.id}
          currentUserRole="contractor"
          currentUserName={profile?.name || "Contractor"}
          otherPartyName="Client"
        />
      )}
    </div>
  );
}
