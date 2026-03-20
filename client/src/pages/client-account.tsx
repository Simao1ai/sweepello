import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Save, CreditCard, Trash2, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@shared/schema";

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "14px",
      color: "#1f2937",
      fontFamily: "inherit",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
};

function AddCardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/billing/setup-intent");
      const { clientSecret } = await res.json();
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });
      if (error) throw new Error(error.message);
      if (setupIntent?.payment_method) {
        const saveRes = await apiRequest("POST", "/api/billing/payment-method/save", {
          paymentMethodId: setupIntent.payment_method,
        });
        if (!saveRes.ok) throw new Error("Failed to save card");
        toast({ title: "Card saved", description: "Your payment method has been added successfully." });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-method"] });
        onSuccess();
      }
    } catch (err: unknown) {
      toast({ title: "Card error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-3 bg-muted/30">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secured by Stripe · 256-bit SSL encryption</span>
      </div>
      <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
        <strong>Test mode:</strong> Use card <code className="font-mono font-bold">4242 4242 4242 4242</code>, any future expiry, and any 3-digit CVV.
      </p>
      <Button type="submit" disabled={loading || !stripe} className="w-full gap-2" data-testid="button-save-card">
        <CreditCard className="h-4 w-4" />
        {loading ? "Saving card..." : "Save Card"}
      </Button>
    </form>
  );
}

function BillingSection() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: paymentMethod, isLoading: pmLoading } = useQuery<{
    hasCard: boolean; brand?: string; last4?: string;
  }>({ queryKey: ["/api/billing/payment-method"] });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/billing/payment-method");
      if (!res.ok) throw new Error("Failed to remove card");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-method"] });
      toast({ title: "Card removed", description: "Your payment method has been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const brandIcons: Record<string, string> = {
    visa: "💳", mastercard: "💳", amex: "💳", discover: "💳",
  };

  if (pmLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-500" /> Payment Method
        </CardTitle>
        <CardDescription>
          A saved card is required to book cleaning services. Your card will be charged if you cancel within 24 hours of the scheduled service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethod?.hasCard ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {brandIcons[paymentMethod.brand || ""] || "💳"}
                    <span className="capitalize">{paymentMethod.brand}</span>
                    <Badge variant="secondary" className="text-xs">···· {paymentMethod.last4}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Card on file</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
                data-testid="button-remove-card"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
              <span>Card details are securely stored by Stripe and never touch our servers.</span>
            </div>
          </div>
        ) : showAddForm ? (
          <div className="space-y-3">
            <AddCardForm onSuccess={() => setShowAddForm(false)} />
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5">
              No card on file. You'll need to add a payment method before booking a cleaning service.
            </p>
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full gap-2"
              data-testid="button-add-card"
            >
              <CreditCard className="h-4 w-4" /> Add Payment Method
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CancellationPolicy() {
  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-500" /> Cancellation Policy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>✅ <strong>Free cancellation</strong> — Cancel more than 24 hours before your scheduled service at no charge.</p>
        <p>⚠️ <strong>$50 cancellation fee</strong> — Cancellations made within 24 hours of the scheduled service time will incur a $50 fee, charged to your saved card. This protects our cleaning professionals who have reserved that time for you.</p>
        <p className="text-xs">The 24-hour window is measured from your scheduled service time, regardless of when the booking was made.</p>
      </CardContent>
    </Card>
  );
}

export default function ClientAccount() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");

  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  useEffect(() => {
    fetch("/api/stripe/publishable-key")
      .then(r => r.json())
      .then(({ publishableKey }) => {
        if (publishableKey) setStripePromise(loadStripe(publishableKey));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (profile) {
      setAddress((profile as any).address || "");
      setCity((profile as any).city || "");
      setZipCode((profile as any).zipCode || "");
      setPhone((profile as any).phone || "");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: object) => {
      const res = await apiRequest("POST", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Account updated", description: "Your information has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ address, city, zipCode, phone });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-lg space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">My Account</h1>
        <p className="text-muted-foreground">Manage your contact info, address, and payment method</p>
      </div>

      {stripePromise ? (
        <Elements stripe={stripePromise}>
          <BillingSection />
        </Elements>
      ) : (
        <BillingSection />
      )}

      <CancellationPolicy />

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" /> Default Property Address
            </CardTitle>
            <CardDescription>
              Pre-filled when you request a new cleaning service.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Ocean Ave"
                value={address}
                onChange={e => setAddress(e.target.value)}
                data-testid="input-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Seaside Heights"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="08751"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  data-testid="input-zip"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" /> Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                data-testid="input-phone"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full gap-2"
          disabled={updateMutation.isPending}
          data-testid="button-save-account"
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
