import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle, XCircle, Clock, Users, Phone, Mail, MapPin, Calendar,
  Shield, Package, ChevronDown, ChevronUp, Bookmark, UserCheck, AlertCircle,
} from "lucide-react";
import type { ContractorApplication, UserProfile } from "@shared/schema";

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

  const [rejectModal, setRejectModal] = useState<{ userId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: applications = [], isLoading } = useQuery<ContractorApplication[]>({
    queryKey: ["/api/admin/contractor-applications"],
  });

  const { data: pendingAccounts = [], isLoading: pendingLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/admin/pending-contractors"],
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

  const approveMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("POST", `/api/admin/pending-contractors/${userId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-contractors"] });
      toast({ title: "Contractor approved!", description: "They can now access the contractor portal. Approval email sent." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiRequest("POST", `/api/admin/pending-contractors/${userId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-contractors"] });
      toast({ title: "Account rejected", description: "Rejection email sent to the contractor." });
      setRejectModal(null);
      setRejectReason("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleAction = () => {
    if (!actionModal) return;
    updateMutation.mutate({ id: actionModal.app.id, status: actionModal.action, note: adminNote });
  };

  const byStatus = (status: string) => applications.filter(a => a.status === status);

  const pendingCount = pendingAccounts.filter(p => (p as any).approvalStatus === "pending").length;
  const rejectedCount = pendingAccounts.filter(p => (p as any).approvalStatus === "rejected").length;

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
        <p className="text-muted-foreground">Review and manage contractor applications and pending accounts</p>
      </div>

      {/* Pending portal accounts alert */}
      {pendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4" data-testid="banner-pending-accounts">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
              {pendingCount} contractor account{pendingCount !== 1 ? "s" : ""} waiting for approval
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              These contractors signed up through the portal and are waiting for your review before they can access their dashboard.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="portal-accounts">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="portal-accounts" data-testid="tab-portal-accounts">
            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            Portal Accounts ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">Public Applications ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="waitlisted" data-testid="tab-waitlisted">Waitlisted ({counts.waitlisted})</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>

        {/* PORTAL ACCOUNTS TAB */}
        <TabsContent value="portal-accounts" className="mt-4 space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border">
            These are contractors who created a CleanSlate account and selected "I'm a Cleaner." They're waiting for your approval before they can access the portal and begin onboarding.
          </div>

          {pendingLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : pendingAccounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No pending contractor accounts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAccounts.map((account: any) => (
                <Card key={account.userId} className="hover:shadow-md transition-shadow" data-testid={`card-account-${account.userId}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold" data-testid={`text-account-id-${account.userId}`}>
                            Contractor Account
                          </p>
                          <Badge className={account.approvalStatus === "rejected" ? STATUS_COLORS.rejected : STATUS_COLORS.pending}>
                            {account.approvalStatus || "pending"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Signed up {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—"}
                          </span>
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">ID: {account.userId}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {account.approvalStatus !== "rejected" && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => approveMutation.mutate(account.userId)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-account-${account.userId}`}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        )}
                        {account.approvalStatus !== "rejected" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setRejectModal({ userId: account.userId, name: "this contractor" }); setRejectReason(""); }}
                            data-testid={`button-reject-account-${account.userId}`}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        )}
                        {account.approvalStatus === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveMutation.mutate(account.userId)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Approve Instead
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PUBLIC APPLICATION TABS */}
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

      {/* Application action dialog */}
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

      {/* Reject portal account dialog */}
      <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Contractor Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A rejection email will be sent to the contractor. You can include a reason below.
            </p>
            <div className="space-y-1">
              <p className="text-sm font-medium">Reason (included in email)</p>
              <Textarea
                placeholder="e.g. We are currently at capacity in your service area..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                data-testid="textarea-reject-reason"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectModal && rejectMutation.mutate({ userId: rejectModal.userId, reason: rejectReason })}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Processing..." : "Reject & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
