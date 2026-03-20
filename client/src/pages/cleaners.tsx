import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Star,
  Clock,
  DollarSign,
  TrendingUp,
  Phone,
  Mail,
  Search,
  ChevronRight,
  Briefcase,
  StickyNote,
  Zap,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Cleaner, Job } from "@shared/schema";

const jobStatusVariant: Record<string, string> = {
  completed: "default",
  in_progress: "secondary",
  assigned: "secondary",
  pending: "outline",
  cancelled: "destructive",
};

interface CleanerDetailData {
  cleaner: Cleaner;
  jobs: Job[];
}

function CleanerDetailSheet({
  cleanerId,
  open,
  onClose,
}: {
  cleanerId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [adminNote, setAdminNote] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [editingAdminNote, setEditingAdminNote] = useState(false);
  const [editingStatusNote, setEditingStatusNote] = useState(false);

  const { data, isLoading } = useQuery<CleanerDetailData>({
    queryKey: ["/api/admin/cleaners", cleanerId],
    enabled: !!cleanerId && open,
    staleTime: 0,
  });

  const updateCleaner = useMutation({
    mutationFn: async (updates: Partial<Cleaner>) => {
      const res = await apiRequest("PATCH", `/api/admin/cleaners/${cleanerId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cleaners", cleanerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaners"] });
      setEditingAdminNote(false);
      setEditingStatusNote(false);
      toast({ title: "Cleaner updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cleaner = data?.cleaner;
  const jobs = [...(data?.jobs || [])].sort(
    (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );

  const completedJobs = jobs.filter((j) => j.status === "completed");
  const activeJobs = jobs.filter((j) => ["assigned", "in_progress"].includes(j.status));

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading || !cleaner ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {cleaner.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <SheetTitle className="flex items-center gap-2">
                    {cleaner.name}
                    {cleaner.isFeatured && (
                      <Zap className="h-4 w-4 text-amber-500" />
                    )}
                  </SheetTitle>
                  <Badge variant={cleaner.status === "active" ? "default" : "secondary"} className="mt-0.5">
                    {cleaner.status}
                  </Badge>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3" /> Rating
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold">{Number(cleaner.rating).toFixed(1)}</span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.round(Number(cleaner.rating))
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> On-Time
                  </div>
                  <div className="space-y-1">
                    <span className="text-xl font-bold">{cleaner.onTimePercent}%</span>
                    <Progress value={cleaner.onTimePercent || 0} className="h-1.5" />
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" /> Total Jobs
                  </div>
                  <span className="text-xl font-bold">{cleaner.totalJobs}</span>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" /> Revenue
                  </div>
                  <span className="text-xl font-bold">${Number(cleaner.totalRevenue).toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{cleaner.phone}</span>
                </div>
                {cleaner.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{cleaner.email}</span>
                  </div>
                )}
                {cleaner.serviceAreas && cleaner.serviceAreas.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{cleaner.serviceAreas.join(", ")}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Pay rate: <span className="font-medium">{cleaner.payRate}%</span></span>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin Controls</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">Receives job offers</p>
                  </div>
                  <Switch
                    checked={cleaner.status === "active"}
                    onCheckedChange={(v) => updateCleaner.mutate({ status: v ? "active" : "inactive" })}
                    data-testid="switch-cleaner-active"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500" /> Featured
                    </p>
                    <p className="text-xs text-muted-foreground">Shown in client picker</p>
                  </div>
                  <Switch
                    checked={cleaner.isFeatured || false}
                    onCheckedChange={(v) => updateCleaner.mutate({ isFeatured: v })}
                    data-testid="switch-cleaner-featured"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    Status Note
                  </Label>
                  {editingStatusNote ? (
                    <div className="space-y-2">
                      <Input
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="e.g. On leave until Jan 15..."
                        className="text-sm"
                        data-testid="input-status-note"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateCleaner.mutate({ statusNote })}
                          disabled={updateCleaner.isPending}
                          data-testid="button-save-status-note"
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingStatusNote(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-muted-foreground cursor-pointer hover:text-foreground rounded border border-dashed p-2 transition-colors"
                      onClick={() => {
                        setStatusNote(cleaner.statusNote || "");
                        setEditingStatusNote(true);
                      }}
                      data-testid="text-status-note"
                    >
                      {cleaner.statusNote || <span className="italic">Click to add status note…</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" /> Admin Note
                  </Label>
                  {editingAdminNote ? (
                    <div className="space-y-2">
                      <Textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Internal notes..."
                        className="text-sm min-h-[80px]"
                        data-testid="input-admin-note"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateCleaner.mutate({ adminNote })}
                          disabled={updateCleaner.isPending}
                          data-testid="button-save-admin-note"
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingAdminNote(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-muted-foreground cursor-pointer hover:text-foreground rounded border border-dashed p-2 transition-colors"
                      onClick={() => {
                        setAdminNote(cleaner.adminNote || "");
                        setEditingAdminNote(true);
                      }}
                      data-testid="text-admin-note"
                    >
                      {cleaner.adminNote || <span className="italic">Click to add note…</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Job History ({jobs.length})
                </h3>
                {activeJobs.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</p>
                    {activeJobs.map((job) => (
                      <div key={job.id} className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 space-y-1.5" data-testid={`card-job-${job.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{job.propertyAddress}</span>
                          <Badge variant={jobStatusVariant[job.status] as any || "outline"} className="text-xs flex-shrink-0">
                            {job.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {new Date(job.scheduledDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {job.cleanerPay && (
                            <>
                              <span>·</span>
                              <span className="font-medium text-foreground">${Number(job.cleanerPay).toFixed(0)} pay</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {completedJobs.length > 0 && (
                  <div className="space-y-1.5">
                    {activeJobs.length > 0 && <p className="text-xs font-medium text-muted-foreground">Past</p>}
                    {completedJobs.map((job) => (
                      <div key={job.id} className="rounded-lg border bg-card p-3 space-y-1.5" data-testid={`card-job-${job.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{job.propertyAddress}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            completed
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {new Date(job.scheduledDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {job.cleanerPay && (
                            <>
                              <span>·</span>
                              <span>${Number(job.cleanerPay).toFixed(0)} paid</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {jobs.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No jobs yet</p>
                )}
                {jobs.filter((j) => !["completed", "assigned", "in_progress"].includes(j.status)).map((job) => (
                  <div key={job.id} className="rounded-lg border bg-card p-3 space-y-1.5" data-testid={`card-job-${job.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{job.propertyAddress}</span>
                      <Badge variant={jobStatusVariant[job.status] as any || "outline"} className="text-xs flex-shrink-0">
                        {job.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(job.scheduledDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CleanerCard({ cleaner, onClick }: { cleaner: Cleaner; onClick: () => void }) {
  return (
    <Card
      className="hover-elevate cursor-pointer transition-all"
      data-testid={`card-cleaner-${cleaner.id}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {cleaner.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5" data-testid={`text-cleaner-name-${cleaner.id}`}>
                {cleaner.name}
                {cleaner.isFeatured && <Zap className="h-3.5 w-3.5 text-amber-500" />}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {cleaner.phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />{cleaner.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={cleaner.status === "active" ? "default" : "secondary"}>
              {cleaner.status}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" /> Rating
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{Number(cleaner.rating).toFixed(1)}</span>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < Math.round(Number(cleaner.rating))
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> On-Time
            </div>
            <div className="space-y-1">
              <span className="text-lg font-bold">{cleaner.onTimePercent}%</span>
              <Progress value={cleaner.onTimePercent || 0} className="h-1.5" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> Total Jobs
            </div>
            <span className="text-lg font-bold">{cleaner.totalJobs}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> Revenue
            </div>
            <span className="text-lg font-bold">${Number(cleaner.totalRevenue).toLocaleString()}</span>
          </div>
        </div>

        {cleaner.statusNote && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-amber-600 dark:text-amber-400">{cleaner.statusNote}</p>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Pay rate: {cleaner.payRate}%</span>
          {cleaner.email && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />{cleaner.email}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Cleaners() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCleanerId, setSelectedCleanerId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: cleaners, isLoading } = useQuery<Cleaner[]>({
    queryKey: ["/api/cleaners"],
  });

  const createCleaner = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/cleaners", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaners"] });
      setDialogOpen(false);
      toast({ title: "Cleaner added", description: "New cleaner has been added to your team." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredCleaners = cleaners?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createCleaner.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string || null,
      phone: formData.get("phone") as string,
      payRate: parseInt(formData.get("payRate") as string) || 70,
      status: "active",
      rating: "5.00",
      onTimePercent: 100,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Cleaners</h1>
          <p className="text-muted-foreground">Manage your cleaning team and track performance</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-cleaner">
              <Plus className="mr-2 h-4 w-4" />
              Add Cleaner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Cleaner</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input name="name" required placeholder="Maria Garcia" data-testid="input-cleaner-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input name="phone" required placeholder="(555) 123-4567" data-testid="input-cleaner-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input name="email" type="email" placeholder="maria@email.com" data-testid="input-cleaner-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payRate">Pay Rate (%)</Label>
                <Input
                  name="payRate"
                  type="number"
                  defaultValue="70"
                  min="0"
                  max="100"
                  data-testid="input-pay-rate"
                />
                <p className="text-xs text-muted-foreground">Percentage of job price paid to cleaner</p>
              </div>
              <Button type="submit" className="w-full" disabled={createCleaner.isPending} data-testid="button-submit-cleaner">
                {createCleaner.isPending ? "Adding..." : "Add Cleaner"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search cleaners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-cleaners"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCleaners?.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCleaners.map((cleaner) => (
            <CleanerCard
              key={cleaner.id}
              cleaner={cleaner}
              onClick={() => setSelectedCleanerId(cleaner.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No cleaners found</p>
          <p className="text-xs text-muted-foreground mt-1">Add cleaners to build your team</p>
        </div>
      )}

      <CleanerDetailSheet
        cleanerId={selectedCleanerId}
        open={!!selectedCleanerId}
        onClose={() => setSelectedCleanerId(null)}
      />
    </div>
  );
}
