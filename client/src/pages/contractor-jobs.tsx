import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, DollarSign, PlayCircle, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function ContractorJobs() {
  const { toast } = useToast();

  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/contractor/jobs"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/contractor/jobs/${jobId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/jobs"] });
      toast({ title: "Job status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
                        <div className="flex gap-2">
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
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
