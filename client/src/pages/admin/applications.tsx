import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Users, Phone, Mail, MapPin, Calendar, Shield, Package, ChevronDown, ChevronUp, Bookmark } from "lucide-react";
import type { ContractorApplication } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  waitlisted: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export default function Applications() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ app: ContractorApplication; action: string } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const { data: applications = [], isLoading } = useQuery<ContractorApplication[]>({
    queryKey: ["/api/admin/contractor-applications"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note: string }) =>
      apiRequest("PATCH", `/api/admin/contractor-applications/${id}`, { status, adminNote: note }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contractor-applications"] });
      toast({ title: `Application ${vars.status}`, description: vars.status === "approved" ? "Approval email sent." : vars.status === "rejected" ? "Rejection email sent." : "Status updated." });
      setActionModal(null);
      setAdminNote("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleAction = () => {
    if (!actionModal) return;
    updateMutation.mutate({ id: actionModal.app.id, status: actionModal.action, note: adminNote });
  };

  const byStatus = (status: string) => applications.filter(a => a.status === status);

  const AppCard = ({ app }: { app: ContractorApplication }) => {
    const isExpanded = expandedId === app.id;
    return (
      <Card key={app.id} className="hover:shadow-md transition-shadow" data-testid={`card-application-${app.id}`}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base" data-testid={`text-applicant-name-${app.id}`}>{app.firstName} {app.lastName}</p>
                <Badge className={STATUS_COLORS[app.status]}>{app.status}</Badge>
                {app.isInsured && <Badge variant="outline" className="text-xs"><Shield className="h-3 w-3 mr-1" />Insured</Badge>}
                {app.hasOwnSupplies && <Badge variant="outline" className="text-xs"><Package className="h-3 w-3 mr-1" />Has Supplies</Badge>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{app.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{app.phone}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{app.city}, NJ {app.zipCode}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "—"}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : app.id)} data-testid={`button-expand-${app.id}`}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {isExpanded && (
            <div className="mt-4 space-y-3 border-t pt-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Experience:</span> <span className="font-medium">{app.yearsExperience} yr{app.yearsExperience !== 1 ? "s" : ""}</span></div>
                <div><span className="text-muted-foreground">Hours:</span> <span className="font-medium">{app.availableHours}</span></div>
              </div>
              <div><span className="text-muted-foreground">Cleaning Types:</span> <span className="font-medium">{app.cleaningTypes}</span></div>
              <div><span className="text-muted-foreground">Available Days:</span> <span className="font-medium">{app.availableDays}</span></div>
              <div><span className="text-muted-foreground">Service Zips:</span> <span className="font-medium">{app.serviceZipCodes}</span></div>
              {app.references && <div><span className="text-muted-foreground">References:</span> <span className="font-medium">{app.references}</span></div>}
              {app.adminNote && (
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">Admin Note:</span> <span>{app.adminNote}</span>
                </div>
              )}

              {app.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-1" onClick={() => { setActionModal({ app, action: "approved" }); setAdminNote(""); }} data-testid={`button-approve-${app.id}`}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setActionModal({ app, action: "waitlisted" }); setAdminNote(""); }} data-testid={`button-waitlist-${app.id}`}>
                    <Bookmark className="h-4 w-4 mr-1" /> Waitlist
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setActionModal({ app, action: "rejected" }); setAdminNote(""); }} data-testid={`button-reject-${app.id}`}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
              {app.status !== "pending" && app.status !== "approved" && (
                <Button size="sm" variant="outline" onClick={() => { setActionModal({ app, action: "approved" }); setAdminNote(""); }} data-testid={`button-reapprove-${app.id}`}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve Now
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const counts = { pending: byStatus("pending").length, approved: byStatus("approved").length, rejected: byStatus("rejected").length, waitlisted: byStatus("waitlisted").length };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contractor Applications</h1>
        <p className="text-muted-foreground">Review and manage incoming contractor applications</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pending", count: counts.pending, icon: Clock, color: "text-yellow-600" },
          { label: "Approved", count: counts.approved, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Waitlisted", count: counts.waitlisted, icon: Bookmark, color: "text-blue-600" },
          { label: "Rejected", count: counts.rejected, icon: XCircle, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label} data-testid={`card-stat-${s.label.toLowerCase()}`}>
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

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="waitlisted" data-testid="tab-waitlisted">Waitlisted ({counts.waitlisted})</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>
        {["pending", "approved", "waitlisted", "rejected"].map(status => (
          <TabsContent key={status} value={status} className="space-y-3 mt-4">
            {isLoading ? <p className="text-muted-foreground">Loading...</p> : byStatus(status).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No {status} applications</p>
              </div>
            ) : byStatus(status).map(app => <AppCard key={app.id} app={app} />)}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!actionModal} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal?.action === "approved" ? "Approve Application" : actionModal?.action === "rejected" ? "Reject Application" : "Waitlist Application"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {actionModal?.action === "approved" && "An approval email will be sent to the applicant with instructions to sign up."}
              {actionModal?.action === "rejected" && "A rejection email will be sent to the applicant."}
              {actionModal?.action === "waitlisted" && "The applicant will be marked as waitlisted. No email is sent."}
            </p>
            <div className="space-y-1">
              <p className="text-sm font-medium">Admin Note {actionModal?.action === "rejected" ? "(included in rejection email)" : "(internal)"}</p>
              <Textarea
                placeholder="Optional note..."
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                data-testid="textarea-admin-note"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={updateMutation.isPending}
              className={actionModal?.action === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : actionModal?.action === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
              data-testid="button-confirm-action"
            >
              {updateMutation.isPending ? "Processing..." : actionModal?.action === "approved" ? "Approve & Send Email" : actionModal?.action === "rejected" ? "Reject & Send Email" : "Confirm Waitlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
