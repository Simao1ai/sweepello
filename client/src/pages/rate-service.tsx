import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, ArrowLeft, CheckCircle, DollarSign, Gift } from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

const TIP_PRESETS = [5, 10, 15, 20];

type Step = "rate" | "tip" | "done";

export default function RateService() {
  const [, params] = useRoute("/rate/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("rate");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [tipSubmitting, setTipSubmitting] = useState(false);

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", params?.id],
    enabled: !!params?.id,
  });

  const rateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/service-requests/${params?.id}/rate`, {
        rating,
        comment: comment || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rating submitted!", description: "Want to leave a tip for your cleaner?" });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/mine"] });
      setStep("tip");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const submitTip = async (amount: number) => {
    if (!request?.jobId) return;
    setTipSubmitting(true);
    try {
      const res = await apiRequest("POST", `/api/jobs/${request.jobId}/tip`, { amount });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Tip failed");
      toast({ title: `$${amount} tip sent! 🎉`, description: "Your cleaner will be notified." });
      setStep("done");
    } catch (err: any) {
      toast({ title: "Could not process tip", description: err.message, variant: "destructive" });
    } finally {
      setTipSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  if (step === "done") {
    return (
      <div className="p-6 max-w-md mx-auto mt-12">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your rating helps us maintain quality service.
            </p>
            <Button onClick={() => navigate("/my-bookings")} data-testid="button-back-to-bookings">
              Back to My Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "tip") {
    const effectiveTip = tipAmount ?? (customTip ? Number(customTip) : null);
    return (
      <div className="p-6 max-w-md mx-auto">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => setStep("done")} data-testid="button-skip-tip-back">
          <ArrowLeft className="h-4 w-4" /> Skip
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              Leave a Tip
            </CardTitle>
            <CardDescription>
              Your cleaner worked hard — show your appreciation!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Tips go directly to your cleaner and are charged to your card on file.
            </p>

            <div className="grid grid-cols-4 gap-2" data-testid="tip-presets">
              {TIP_PRESETS.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => { setTipAmount(amount); setCustomTip(""); }}
                  className={`rounded-xl border-2 py-3 text-center font-semibold text-sm transition-all ${
                    tipAmount === amount
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`button-tip-${amount}`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-tip">Custom Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="custom-tip"
                  type="number"
                  min="1"
                  max="500"
                  placeholder="Enter amount"
                  className="pl-8"
                  value={customTip}
                  onChange={e => { setCustomTip(e.target.value); setTipAmount(null); }}
                  data-testid="input-custom-tip"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("done")}
                data-testid="button-skip-tip"
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                disabled={!effectiveTip || effectiveTip < 1 || tipSubmitting}
                onClick={() => effectiveTip && submitTip(effectiveTip)}
                data-testid="button-send-tip"
              >
                {tipSubmitting
                  ? "Processing..."
                  : effectiveTip
                  ? `Send $${effectiveTip} Tip`
                  : "Select Amount"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // step === "rate"
  return (
    <div className="p-6 max-w-md mx-auto">
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/my-bookings")} data-testid="button-back">
        <ArrowLeft className="h-4 w-4" /> Back to Bookings
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate Your Cleaning
          </CardTitle>
          <CardDescription>
            {request?.propertyAddress || ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>How was your experience?</Label>
            <div className="flex gap-2 justify-center py-2" data-testid="rating-stars">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoveredRating(i)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(i)}
                  className="transition-transform hover:scale-110"
                  data-testid={`button-star-${i}`}
                >
                  <Star
                    className={`h-10 w-10 ${
                      i <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comments (optional)</Label>
            <Textarea
              id="comment"
              data-testid="input-comment"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={rating === 0 || rateMutation.isPending}
            onClick={() => rateMutation.mutate()}
            data-testid="button-submit-rating"
          >
            {rateMutation.isPending ? "Submitting..." : "Submit Rating"}
          </Button>

          {request?.jobId && (
            <p className="text-xs text-center text-muted-foreground">
              You'll have a chance to tip your cleaner after submitting.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
