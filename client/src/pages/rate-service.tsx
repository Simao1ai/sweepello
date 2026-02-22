import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Star, ArrowLeft, CheckCircle } from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

export default function RateService() {
  const [, params] = useRoute("/rate/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", params?.id],
    enabled: !!params?.id,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/service-requests/${params?.id}/rate`, {
        rating,
        comment: comment || null,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Thank you!", description: "Your rating has been submitted." });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/mine"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  if (submitted) {
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
            disabled={rating === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
            data-testid="button-submit-rating"
          >
            {mutation.isPending ? "Submitting..." : "Submit Rating"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
