import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Search, Plus, Clock, ChevronDown, ChevronUp } from "lucide-react";
import type { Dispute } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  investigating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export default function Disputes() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updateModal, setUpdateModal] = useState<Dispute | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newDispute, setNewDispute] = useState({ title: "", description: "", jobId: "", clientId: "", cleanerId: "" });
  const [search, setSearch] = useState("");

  const { data: disputes = [], isLoading } = useQuery<Dispute[]>({
    queryKey: ["/api/admin/disputes"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/disputes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
      toast({ title: "Dispute updated" });
      setUpdateModal(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/disputes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
      toast({ title: "Dispute created" });
      setShowNewForm(false);
      setNewDispute({ title: "", description: "", jobId: "", clientId: "", cleanerId: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openUpdate = (dispute: Dispute) => {
    setUpdateModal(dispute);
    setNewStatus(dispute.status);
    setAdminNote(dispute.adminNote || "");
    setResolutionNote(dispute.resolutionNote || "");
  };

  const byStatus = (s: string) => disputes.filter(d => d.status === s);
  const filtered = disputes.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.description.toLowerCase().includes(search.toLowerCase())
  );

  const DisputeCard = ({ dispute }: { dispute: Dispute }) => {
    const isExpanded = expandedId === dispute.id;
    return (
      <Card className="hover:shadow-md transition-shadow" data-testid={`card-dispute-${dispute.id}`}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold" data-testid={`text-dispute-title-${dispute.id}`}>{dispute.title}</p>
                <Badge className={STATUS_COLORS[dispute.status]}>{dispute.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{dispute.createdAt ? new Date(dispute.createdAt).toLocaleDateString() : ""}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : dispute.id)} data-testid={`button-expand-dispute-${dispute.id}`}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {isExpanded && (
            <div className="mt-3 space-y-3 border-t pt-3 text-sm">
              <p className="text-muted-foreground">{dispute.description}</p>
              {dispute.clientId && <p><span className="text-muted-foreground">Client ID:</span> {dispute.clientId}</p>}
              {dispute.cleanerId && <p><span className="text-muted-foreground">Cleaner ID:</span> {dispute.cleanerId}</p>}
              {dispute.jobId && <p><span className="text-muted-foreground">Job ID:</span> {dispute.jobId}</p>}
              {dispute.adminNote && (
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground font-medium">Admin Note:</span> {dispute.adminNote}
                </div>
              )}
              {dispute.resolutionNote && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded p-2">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">Resolution:</span> {dispute.resolutionNote}
                </div>
              )}
              {dispute.resolvedAt && <p className="text-xs text-muted-foreground">Resolved: {new Date(dispute.resolvedAt).toLocaleDateString()}</p>}
              <Button size="sm" onClick={() => openUpdate(dispute)} data-testid={`button-update-dispute-${dispute.id}`}>Update Status</Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dispute Resolution</h1>
          <p className="text-muted-foreground">Manage and resolve conflicts between clients and contractors</p>
        </div>
        <Button onClick={() => setShowNewForm(true)} data-testid="button-new-dispute">
          <Plus className="h-4 w-4 mr-1" /> New Dispute
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open", count: byStatus("open").length, icon: AlertTriangle, color: "text-red-500" },
          { label: "Investigating", count: byStatus("investigating").length, icon: Clock, color: "text-yellow-600" },
          { label: "Resolved", count: byStatus("resolved").length, icon: CheckCircle, color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label} data-testid={`card-dispute-stat-${s.label.toLowerCase()}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search disputes..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-disputes" />
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open" data-testid="tab-open-disputes">Open ({byStatus("open").length})</TabsTrigger>
          <TabsTrigger value="investigating" data-testid="tab-investigating-disputes">Investigating ({byStatus("investigating").length})</TabsTrigger>
          <TabsTrigger value="resolved" data-testid="tab-resolved-disputes">Resolved ({byStatus("resolved").length})</TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all-disputes">All ({disputes.length})</TabsTrigger>
        </TabsList>
        {["open", "investigating", "resolved"].map(status => (
          <TabsContent key={status} value={status} className="space-y-3 mt-4">
            {isLoading ? <p className="text-muted-foreground">Loading...</p> : byStatus(status).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No {status} disputes</p>
            ) : byStatus(status).map(d => <DisputeCard key={d.id} dispute={d} />)}
          </TabsContent>
        ))}
        <TabsContent value="all" className="space-y-3 mt-4">
          {(search ? filtered : disputes).map(d => <DisputeCard key={d.id} dispute={d} />)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!updateModal} onOpenChange={() => setUpdateModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Dispute</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <div className="flex gap-2">
                {["open", "investigating", "resolved"].map(s => (
                  <Button key={s} size="sm" variant={newStatus === s ? "default" : "outline"} onClick={() => setNewStatus(s)} data-testid={`button-status-${s}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Admin Note (internal)</Label>
              <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} data-testid="textarea-dispute-admin-note" rows={2} placeholder="Investigation notes..." />
            </div>
            {newStatus === "resolved" && (
              <div className="space-y-1">
                <Label>Resolution Note</Label>
                <Textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} data-testid="textarea-resolution-note" rows={2} placeholder="How was this resolved?" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateModal(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({ id: updateModal!.id, data: { status: newStatus, adminNote, resolutionNote } })} disabled={updateMutation.isPending} data-testid="button-save-dispute">
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open New Dispute</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={newDispute.title} onChange={e => setNewDispute(d => ({ ...d, title: e.target.value }))} data-testid="input-dispute-title" placeholder="Brief summary..." />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={newDispute.description} onChange={e => setNewDispute(d => ({ ...d, description: e.target.value }))} data-testid="textarea-dispute-description" rows={3} placeholder="Describe the issue in detail..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Job ID (optional)</Label>
                <Input value={newDispute.jobId} onChange={e => setNewDispute(d => ({ ...d, jobId: e.target.value }))} data-testid="input-dispute-job-id" placeholder="Job ID" />
              </div>
              <div className="space-y-1">
                <Label>Client ID (optional)</Label>
                <Input value={newDispute.clientId} onChange={e => setNewDispute(d => ({ ...d, clientId: e.target.value }))} data-testid="input-dispute-client-id" placeholder="Client ID" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Cleaner ID (optional)</Label>
              <Input value={newDispute.cleanerId} onChange={e => setNewDispute(d => ({ ...d, cleanerId: e.target.value }))} data-testid="input-dispute-cleaner-id" placeholder="Cleaner ID" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(newDispute)} disabled={createMutation.isPending || !newDispute.title || !newDispute.description} data-testid="button-create-dispute">
              {createMutation.isPending ? "Creating..." : "Open Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
