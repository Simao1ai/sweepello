import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Eye, EyeOff, Pencil, Trash2, AlertTriangle, CheckCircle, MessageSquare } from "lucide-react";
import type { Review } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  hidden: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-4 w-4 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

export default function ReviewModeration() {
  const { toast } = useToast();
  const [editModal, setEditModal] = useState<Review | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editRating, setEditRating] = useState("");
  const [editNote, setEditNote] = useState("");

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/reviews/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: "Review updated" });
      setEditModal(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const setStatus = (review: Review, status: string) => {
    updateMutation.mutate({ id: review.id, data: { moderationStatus: status } });
  };

  const openEdit = (review: Review) => {
    setEditModal(review);
    setEditComment(review.comment || "");
    setEditRating(String(review.rating));
    setEditNote(review.adminNote || "");
  };

  const saveEdit = () => {
    if (!editModal) return;
    updateMutation.mutate({ id: editModal.id, data: { comment: editComment, rating: Number(editRating), adminNote: editNote } });
  };

  const byStatus = (s: string) => reviews.filter(r => (r.moderationStatus || "approved") === s);
  const flagged = reviews.filter(r => r.rating <= 2);

  const ReviewCard = ({ review }: { review: Review }) => {
    const status = review.moderationStatus || "approved";
    return (
      <Card className="hover:shadow-md transition-shadow" data-testid={`card-review-${review.id}`}>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StarDisplay rating={review.rating} />
                <Badge className={STATUS_COLORS[status]}>{status}</Badge>
                {review.rating <= 2 && <Badge variant="outline" className="text-red-600 border-red-300 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Low Rating</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {(review as any).jobAddress ? `📍 ${(review as any).jobAddress}` : `Job #${review.jobId?.slice(0, 8)}`}
                {" · "}
                <span>Client: {(review as any).clientName || `#${review.clientId?.slice(0, 8)}`}</span>
                {" · "}
                <span>Cleaner: {(review as any).cleanerName || `#${review.cleanerId?.slice(0, 8)}`}</span>
              </p>
              {review.comment && <p className="text-sm mt-1" data-testid={`text-review-comment-${review.id}`}>"{review.comment}"</p>}
              {review.adminNote && (
                <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
                  <span className="font-medium">Admin note:</span> {review.adminNote}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {status !== "approved" && (
              <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => setStatus(review, "approved")} data-testid={`button-approve-review-${review.id}`}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
            )}
            {status !== "hidden" && (
              <Button size="sm" variant="outline" className="text-gray-600" onClick={() => setStatus(review, "hidden")} data-testid={`button-hide-review-${review.id}`}>
                <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => openEdit(review)} data-testid={`button-edit-review-${review.id}`}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Moderation</h1>
        <p className="text-muted-foreground">Approve, hide, or edit client reviews before they affect contractor scores</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", count: reviews.length, icon: MessageSquare, color: "text-indigo-600" },
          { label: "Approved", count: byStatus("approved").length, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Hidden", count: byStatus("hidden").length, icon: EyeOff, color: "text-gray-500" },
          { label: "Flagged (≤2★)", count: flagged.length, icon: AlertTriangle, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label} data-testid={`card-review-stat-${s.label.toLowerCase()}`}>
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

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-reviews">All ({reviews.length})</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved-reviews">Approved ({byStatus("approved").length})</TabsTrigger>
          <TabsTrigger value="hidden" data-testid="tab-hidden-reviews">Hidden ({byStatus("hidden").length})</TabsTrigger>
          <TabsTrigger value="flagged" data-testid="tab-flagged-reviews">Flagged ({flagged.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-3 mt-4">
          {isLoading ? <p className="text-muted-foreground">Loading...</p> : reviews.length === 0 ? <p className="text-muted-foreground py-8 text-center">No reviews yet</p> : reviews.map(r => <ReviewCard key={r.id} review={r} />)}
        </TabsContent>
        <TabsContent value="approved" className="space-y-3 mt-4">
          {byStatus("approved").map(r => <ReviewCard key={r.id} review={r} />)}
        </TabsContent>
        <TabsContent value="hidden" className="space-y-3 mt-4">
          {byStatus("hidden").length === 0 ? <p className="text-center text-muted-foreground py-8">No hidden reviews</p> : byStatus("hidden").map(r => <ReviewCard key={r.id} review={r} />)}
        </TabsContent>
        <TabsContent value="flagged" className="space-y-3 mt-4">
          {flagged.length === 0 ? <p className="text-center text-muted-foreground py-8">No flagged reviews</p> : flagged.map(r => <ReviewCard key={r.id} review={r} />)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Review</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Rating</p>
              <Select value={editRating} onValueChange={setEditRating}>
                <SelectTrigger data-testid="select-edit-rating"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} Star{n !== 1 ? "s" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Review Comment</p>
              <Textarea value={editComment} onChange={e => setEditComment(e.target.value)} data-testid="textarea-edit-comment" rows={3} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Admin Note (internal)</p>
              <Textarea value={editNote} onChange={e => setEditNote(e.target.value)} data-testid="textarea-edit-note" placeholder="Reason for edit..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={updateMutation.isPending} data-testid="button-save-review-edit">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
