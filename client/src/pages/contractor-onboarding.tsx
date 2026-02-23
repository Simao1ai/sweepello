import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContractorOnboarding } from "@shared/schema";
import {
  User, FileText, Shield, CreditCard, CheckCircle2, ChevronRight, ChevronLeft, Loader2, ExternalLink,
} from "lucide-react";

const steps = [
  { id: 1, title: "Business Info", icon: User, description: "Your contact and business details" },
  { id: 2, title: "W-9 Agreement", icon: FileText, description: "Tax information acknowledgment" },
  { id: 3, title: "Insurance", icon: Shield, description: "Liability insurance details" },
  { id: 4, title: "Payment Setup", icon: CreditCard, description: "Connect your bank for payouts" },
];

export default function ContractorOnboardingPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const stepFromUrl = params.get("step");
  const isComplete = params.get("complete") === "true";

  const [currentStep, setCurrentStep] = useState(stepFromUrl ? parseInt(stepFromUrl) : 1);

  const [formData, setFormData] = useState({
    fullName: "",
    businessName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "NJ",
    zipCode: "",
    serviceZipCodes: "",
  });

  const [w9SignatureName, setW9SignatureName] = useState("");
  const [w9Agreed, setW9Agreed] = useState(false);

  const [insuranceData, setInsuranceData] = useState({
    hasInsurance: false,
    insuranceProvider: "",
    insurancePolicyNumber: "",
    insuranceExpirationDate: "",
  });

  const { data: onboarding, isLoading } = useQuery<ContractorOnboarding | null>({
    queryKey: ["/api/contractor/onboarding"],
  });

  const { data: stripeStatus } = useQuery<{
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted?: boolean;
  }>({
    queryKey: ["/api/contractor/onboarding/stripe-status"],
    enabled: currentStep === 4,
    refetchInterval: isComplete ? 3000 : false,
  });

  useEffect(() => {
    if (onboarding) {
      setFormData({
        fullName: onboarding.fullName || "",
        businessName: onboarding.businessName || "",
        email: onboarding.email || "",
        phone: onboarding.phone || "",
        address: onboarding.address || "",
        city: onboarding.city || "",
        state: onboarding.state || "NJ",
        zipCode: onboarding.zipCode || "",
        serviceZipCodes: onboarding.serviceZipCodes || "",
      });
      if (onboarding.w9Signed) {
        setW9SignatureName(onboarding.w9SignatureName || "");
        setW9Agreed(true);
      }
      setInsuranceData({
        hasInsurance: onboarding.hasInsurance || false,
        insuranceProvider: onboarding.insuranceProvider || "",
        insurancePolicyNumber: onboarding.insurancePolicyNumber || "",
        insuranceExpirationDate: onboarding.insuranceExpirationDate || "",
      });
    }
  }, [onboarding]);

  const saveInfoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contractor/onboarding", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/onboarding"] });
      toast({ title: "Information saved" });
      setCurrentStep(2);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveW9Mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contractor/onboarding/w9", { signatureName: w9SignatureName });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/onboarding"] });
      toast({ title: "W-9 signed" });
      setCurrentStep(3);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveInsuranceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contractor/onboarding/insurance", insuranceData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/onboarding"] });
      toast({ title: "Insurance info saved" });
      setCurrentStep(4);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const stripeConnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contractor/onboarding/stripe-connect");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contractor/onboarding/complete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/onboarding"] });
      toast({ title: "Onboarding complete!", description: "You can now start accepting jobs." });
      setLocation("/contractor/jobs");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isStep1Complete = !!onboarding;
  const isStep2Complete = !!onboarding?.w9Signed;
  const isStep3Complete = onboarding?.hasInsurance !== undefined && onboarding?.hasInsurance !== null;
  const isStripeComplete = stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled;

  function getStepStatus(stepId: number) {
    if (stepId === 1 && isStep1Complete) return "complete";
    if (stepId === 2 && isStep2Complete) return "complete";
    if (stepId === 3 && isStep3Complete) return "complete";
    if (stepId === 4 && isStripeComplete) return "complete";
    if (stepId === currentStep) return "current";
    return "pending";
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" data-testid="text-onboarding-title">Contractor Onboarding</h1>
        <p className="text-muted-foreground mt-1">Complete these steps to start accepting cleaning jobs</p>
      </div>

      <div className="flex items-center justify-between mb-8">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  status === "complete"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : status === "current"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`button-step-${step.id}`}
              >
                {status === "complete" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Tell us about yourself and your cleaning business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Legal Name *</Label>
                <Input
                  id="fullName"
                  data-testid="input-fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name (optional)</Label>
                <Input
                  id="businessName"
                  data-testid="input-businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Doe's Cleaning LLC"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                data-testid="input-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  data-testid="input-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Toms River"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  data-testid="input-state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NJ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  data-testid="input-zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="08753"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceZipCodes">Service Area ZIP Codes (comma-separated)</Label>
              <Input
                id="serviceZipCodes"
                data-testid="input-serviceZipCodes"
                value={formData.serviceZipCodes}
                onChange={(e) => setFormData({ ...formData, serviceZipCodes: e.target.value })}
                placeholder="08753, 08759, 08757, 08005"
              />
              <p className="text-xs text-muted-foreground">Enter the ZIP codes where you're willing to work</p>
            </div>
            <Button
              onClick={() => saveInfoMutation.mutate()}
              disabled={saveInfoMutation.isPending || !formData.fullName || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.zipCode}
              className="w-full"
              data-testid="button-save-info"
            >
              {saveInfoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save & Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>W-9 Tax Information</CardTitle>
            <CardDescription>As an independent contractor, we need your W-9 acknowledgment for tax reporting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {onboarding?.w9Signed ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">W-9 Signed</p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Signed by {onboarding.w9SignatureName} on{" "}
                    {onboarding.w9SignedAt ? new Date(onboarding.w9SignedAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
                  <p className="font-semibold">W-9 Certification Agreement</p>
                  <p>By signing below, I certify that:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>The name and taxpayer identification number (TIN) I provide are correct</li>
                    <li>I am a U.S. citizen, U.S. resident alien, or other U.S. person</li>
                    <li>I am not subject to backup withholding</li>
                    <li>I will provide a completed IRS Form W-9 upon request</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-4">
                    The IRS requires us to collect this information. Your personal information is kept secure and confidential.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="w9agree"
                    checked={w9Agreed}
                    onCheckedChange={(checked) => setW9Agreed(checked === true)}
                    data-testid="checkbox-w9-agree"
                  />
                  <Label htmlFor="w9agree" className="text-sm cursor-pointer">
                    I have read and agree to the W-9 certification above
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="w9signature">Electronic Signature (type your full legal name) *</Label>
                  <Input
                    id="w9signature"
                    data-testid="input-w9-signature"
                    value={w9SignatureName}
                    onChange={(e) => setW9SignatureName(e.target.value)}
                    placeholder="Your full legal name"
                    className="font-serif italic text-lg"
                  />
                </div>
              </>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(1)} data-testid="button-back-step1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {!onboarding?.w9Signed ? (
                <Button
                  onClick={() => saveW9Mutation.mutate()}
                  disabled={saveW9Mutation.isPending || !w9Agreed || !w9SignatureName}
                  className="flex-1"
                  data-testid="button-sign-w9"
                >
                  {saveW9Mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign W-9
                </Button>
              ) : (
                <Button onClick={() => setCurrentStep(3)} className="flex-1" data-testid="button-continue-step3">
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Liability Insurance</CardTitle>
            <CardDescription>Insurance information for cleaning services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="hasInsurance"
                checked={insuranceData.hasInsurance}
                onCheckedChange={(checked) =>
                  setInsuranceData({ ...insuranceData, hasInsurance: checked === true })
                }
                data-testid="checkbox-has-insurance"
              />
              <Label htmlFor="hasInsurance" className="cursor-pointer">
                I have general liability insurance for my cleaning business
              </Label>
            </div>
            {insuranceData.hasInsurance && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input
                    id="insuranceProvider"
                    data-testid="input-insurance-provider"
                    value={insuranceData.insuranceProvider}
                    onChange={(e) => setInsuranceData({ ...insuranceData, insuranceProvider: e.target.value })}
                    placeholder="State Farm, Allstate, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                  <Input
                    id="insurancePolicyNumber"
                    data-testid="input-insurance-policy"
                    value={insuranceData.insurancePolicyNumber}
                    onChange={(e) => setInsuranceData({ ...insuranceData, insurancePolicyNumber: e.target.value })}
                    placeholder="POL-123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceExpirationDate">Expiration Date</Label>
                  <Input
                    id="insuranceExpirationDate"
                    type="date"
                    data-testid="input-insurance-expiration"
                    value={insuranceData.insuranceExpirationDate}
                    onChange={(e) => setInsuranceData({ ...insuranceData, insuranceExpirationDate: e.target.value })}
                  />
                </div>
              </div>
            )}
            {!insuranceData.hasInsurance && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm">
                <p className="font-medium text-yellow-700 dark:text-yellow-400">Insurance Recommended</p>
                <p className="text-yellow-600 dark:text-yellow-500">
                  While not strictly required, we strongly recommend having general liability insurance
                  to protect yourself and your clients.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(2)} data-testid="button-back-step2">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => saveInsuranceMutation.mutate()}
                disabled={saveInsuranceMutation.isPending}
                className="flex-1"
                data-testid="button-save-insurance"
              >
                {saveInsuranceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Setup</CardTitle>
            <CardDescription>Connect your bank account to receive payouts for completed jobs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isStripeComplete ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">Payment Account Connected</p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Your Stripe account is fully set up and ready to receive payouts.
                  </p>
                </div>
              </div>
            ) : stripeStatus?.connected && stripeStatus?.detailsSubmitted ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                <Loader2 className="h-5 w-5 text-yellow-600 animate-spin mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">Account Under Review</p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    Your details have been submitted. Stripe is reviewing your account.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
                  <p className="font-semibold">Secure Payment Setup with Stripe</p>
                  <p>We use Stripe to securely handle contractor payouts. You'll be redirected to Stripe to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Verify your identity</li>
                    <li>Connect your bank account</li>
                    <li>Set up direct deposit for job payouts</li>
                  </ul>
                </div>
                <Button
                  onClick={() => stripeConnectMutation.mutate()}
                  disabled={stripeConnectMutation.isPending || !onboarding}
                  className="w-full"
                  data-testid="button-connect-stripe"
                >
                  {stripeConnectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Connect with Stripe
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(3)} data-testid="button-back-step3">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending || !onboarding?.w9Signed}
                className="flex-1"
                data-testid="button-complete-onboarding"
              >
                {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Complete Onboarding
              </Button>
            </div>

            {!onboarding?.w9Signed && (
              <p className="text-sm text-destructive text-center">
                Please complete the W-9 step before finishing onboarding
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
