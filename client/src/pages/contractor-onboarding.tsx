import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContractorOnboarding } from "@shared/schema";
import {
  User, FileText, Shield, CreditCard, CheckCircle2, ChevronRight, ChevronLeft, Loader2, ExternalLink, Scale, XCircle,
} from "lucide-react";

const steps = [
  { id: 1, title: "Business Info", icon: User, description: "Your contact and business details" },
  { id: 2, title: "Agreement", icon: Scale, description: "Independent subcontractor agreement" },
  { id: 3, title: "W-9 Agreement", icon: FileText, description: "Tax information acknowledgment" },
  { id: 4, title: "Insurance", icon: Shield, description: "Liability insurance details" },
  { id: 5, title: "Payment Setup", icon: CreditCard, description: "Connect your bank for payouts" },
];

function AgreementContent() {
  return (
    <div className="space-y-6 text-sm">
      <div>
        <h3 className="font-bold text-base mb-2">INDEPENDENT SUBCONTRACTOR AGREEMENT</h3>
        <p className="text-muted-foreground italic">(Cleaning Services Brokerage Model)</p>
      </div>

      <p>
        This Independent Subcontractor Agreement ("Agreement") is entered into as of the date of electronic acceptance ("Effective Date"), by and between:
      </p>
      <p>
        <strong>[Company Name], LLC</strong>, a New Jersey limited liability company ("Company"),
        and the undersigned Subcontractor ("Subcontractor"). Collectively, the "Parties."
      </p>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">1. Independent Contractor Status (NJ Compliant Language)</h4>
        <p className="mb-2">The Parties expressly agree that Subcontractor is an independent contractor and not an employee of the Company.</p>
        <p className="mb-1">Subcontractor:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Operates an independently established cleaning business</li>
          <li>Is free to accept or decline service opportunities</li>
          <li>Sets their own schedule (within job timeframes)</li>
          <li>Uses their own tools, equipment, and supplies</li>
          <li>May perform services for other companies or clients</li>
          <li>Is responsible for all taxes, insurance, and business expenses</li>
          <li>Is not eligible for unemployment insurance, workers compensation, benefits, or overtime</li>
        </ul>
        <p className="mt-2">Nothing herein shall be construed as creating an employer-employee relationship under New Jersey law.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">2. Scope of Services</h4>
        <p className="mb-1">Subcontractor agrees to perform residential and/or commercial cleaning services, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Standard cleaning</li>
          <li>Deep cleaning</li>
          <li>Move-in / move-out cleaning</li>
          <li>Post-construction cleaning</li>
          <li>Recurring maintenance services</li>
          <li>Add-on specialty services</li>
        </ul>
        <p className="mt-2">All services must meet professional industry standards.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">3. Job Assignment Process</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Service requests are offered through the Company platform.</li>
          <li>Subcontractor may accept or decline.</li>
          <li>Once accepted, the job becomes a binding commitment.</li>
          <li>Failure to complete an accepted job without reasonable cause may result in suspension or termination.</li>
        </ul>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">4. Compensation Structure</h4>
        <p className="mb-2">Subcontractor shall be paid per completed job as outlined prior to acceptance.</p>
        <p className="font-medium mb-1">Payment Terms:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Payment issued after job completion and client confirmation.</li>
          <li>Paid via ACH or approved electronic method.</li>
          <li>Company retains its brokerage/platform service fee.</li>
        </ul>
        <p className="mt-2">Subcontractor acknowledges that compensation is project-based, not hourly employment wages.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">5. Insurance Requirements (Strongly Recommended in NJ)</h4>
        <p className="mb-1">Subcontractor agrees to maintain:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>General Liability Insurance (minimum $1,000,000 per occurrence)</li>
          <li>Any required NJ business registration</li>
          <li>If applicable, NJ Business Registration Certificate (BRC)</li>
        </ul>
        <p className="mt-2 mb-1">Subcontractor assumes full liability for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Property damage</li>
          <li>Bodily injury</li>
          <li>Negligence</li>
          <li>Acts of assistants or helpers</li>
        </ul>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">6. Supplies & Equipment</h4>
        <p className="mb-1">Subcontractor shall provide:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>All cleaning products</li>
          <li>Equipment and machinery</li>
          <li>Protective gear</li>
          <li>Transportation</li>
        </ul>
        <p className="mt-2">Company does not provide tools or supplies.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">7. Non-Solicitation of Clients (Critical Protection)</h4>
        <p className="mb-2">During this Agreement and for 18 months following termination, Subcontractor agrees not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Directly solicit Company clients</li>
          <li>Accept direct payment from Company clients</li>
          <li>Provide services outside the Company platform to introduced clients</li>
        </ul>
        <p className="mt-2 mb-1">Violation may result in:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Immediate termination</li>
          <li>Liquidated damages equal to 12 months of estimated client value</li>
          <li>Legal action</li>
        </ul>
        <p className="mt-2 font-medium">This clause survives termination.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">8. Confidentiality</h4>
        <p className="mb-1">Subcontractor shall not disclose:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Client data</li>
          <li>Pricing structure</li>
          <li>Platform systems</li>
          <li>Operational processes</li>
        </ul>
        <p className="mt-2 font-medium">Confidentiality survives termination.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">9. Quality & Performance Standards</h4>
        <p className="mb-1">Subcontractor agrees to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Arrive on time</li>
          <li>Maintain professional conduct</li>
          <li>Perform services according to booking specifications</li>
          <li>Remedy reported deficiencies within 48 hours when applicable</li>
          <li>Maintain satisfactory client ratings</li>
        </ul>
        <p className="mt-2">Repeated complaints may result in suspension or termination.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">10. Indemnification</h4>
        <p>Subcontractor shall indemnify and hold harmless the Company from any claims, losses, damages, or legal fees arising from negligent acts, property damage, injury claims, or breach of this Agreement.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">11. Background Check Authorization</h4>
        <p>Subcontractor consents to background verification as permitted under NJ law.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">12. Term & Termination</h4>
        <p className="mb-2">This Agreement remains in effect until terminated.</p>
        <p className="mb-1">Either party may terminate:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>With 7 days written notice</li>
          <li>Immediately for breach, misconduct, fraud, safety violations, or client harm</li>
        </ul>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">13. Dispute Resolution (NJ Enforceable Structure)</h4>
        <p className="mb-1">The Parties agree:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Good faith mediation first</li>
          <li>Binding arbitration in the State of New Jersey</li>
        </ol>
        <p className="mt-2">Arbitration shall be conducted under the rules of the American Arbitration Association. Each party bears its own legal fees unless otherwise awarded.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">14. Governing Law</h4>
        <p>This Agreement shall be governed by the laws of the State of New Jersey.</p>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-2">15. Electronic Signature</h4>
        <p>Electronic acceptance through the Company platform constitutes a legally binding signature.</p>
      </div>
    </div>
  );
}

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

  const [agreementSignatureName, setAgreementSignatureName] = useState("");
  const [agreementAgreed, setAgreementAgreed] = useState(false);

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
    enabled: currentStep === 5,
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
      if (onboarding.agreementSigned) {
        setAgreementSignatureName(onboarding.agreementSignatureName || "");
        setAgreementAgreed(true);
      }
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

  const saveAgreementMutation = useMutation({
    mutationFn: async (params: { signatureName: string; agreed: boolean }) => {
      const res = await apiRequest("POST", "/api/contractor/onboarding/agreement", params);
      return res.json();
    },
    onSuccess: (_data: ContractorOnboarding, variables: { signatureName: string; agreed: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/onboarding"] });
      if (variables.agreed) {
        toast({ title: "Agreement signed" });
        setCurrentStep(3);
      } else {
        toast({ title: "Agreement declined", description: "You can review and sign later to continue onboarding.", variant: "destructive" });
      }
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
      setCurrentStep(4);
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
      setCurrentStep(5);
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
  const isStep2Complete = !!onboarding?.agreementSigned;
  const isStep3Complete = !!onboarding?.w9Signed;
  const isStep4Complete = onboarding?.hasInsurance !== undefined && onboarding?.hasInsurance !== null;
  const isStripeComplete = stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled;

  function getStepStatus(stepId: number) {
    if (stepId === 1 && isStep1Complete) return "complete";
    if (stepId === 2 && isStep2Complete) return "complete";
    if (stepId === 3 && isStep3Complete) return "complete";
    if (stepId === 4 && isStep4Complete) return "complete";
    if (stepId === 5 && isStripeComplete) return "complete";
    if (stepId === currentStep) return "current";
    return "pending";
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" data-testid="text-onboarding-title">Contractor Onboarding</h1>
        <p className="text-muted-foreground mt-1">Complete these steps to start accepting cleaning jobs</p>
      </div>

      <div className="flex items-center justify-between mb-8 overflow-x-auto">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-shrink-0">
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
                <span className="hidden md:inline text-sm font-medium">{step.title}</span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
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
            <CardTitle>Independent Subcontractor Agreement</CardTitle>
            <CardDescription>Please read this agreement carefully before signing or declining</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {onboarding?.agreementSigned ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">Agreement Signed</p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Signed by {onboarding.agreementSignatureName} on{" "}
                    {onboarding.agreementSignedAt ? new Date(onboarding.agreementSignedAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            ) : onboarding?.agreementDeclined ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">Agreement Declined</p>
                  <p className="text-sm text-red-600 dark:text-red-500">
                    You have declined this agreement. You must sign to complete onboarding and start accepting jobs.
                  </p>
                </div>
              </div>
            ) : null}

            <ScrollArea className="h-[400px] rounded-lg border p-4" data-testid="scroll-agreement-content">
              <AgreementContent />
            </ScrollArea>

            {!onboarding?.agreementSigned && (
              <>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agreementAgree"
                    checked={agreementAgreed}
                    onCheckedChange={(checked) => setAgreementAgreed(checked === true)}
                    data-testid="checkbox-agreement-agree"
                  />
                  <Label htmlFor="agreementAgree" className="text-sm cursor-pointer">
                    I have read and understand this Independent Subcontractor Agreement
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agreementSignature">Electronic Signature (type your full legal name) *</Label>
                  <Input
                    id="agreementSignature"
                    data-testid="input-agreement-signature"
                    value={agreementSignatureName}
                    onChange={(e) => setAgreementSignatureName(e.target.value)}
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
              {!onboarding?.agreementSigned ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => saveAgreementMutation.mutate({ signatureName: "", agreed: false })}
                    disabled={saveAgreementMutation.isPending}
                    data-testid="button-decline-agreement"
                  >
                    {saveAgreementMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-1" />}
                    Decline
                  </Button>
                  <Button
                    onClick={() => saveAgreementMutation.mutate({ signatureName: agreementSignatureName, agreed: true })}
                    disabled={saveAgreementMutation.isPending || !agreementAgreed || !agreementSignatureName}
                    className="flex-1"
                    data-testid="button-sign-agreement"
                  >
                    {saveAgreementMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Agree & Sign
                  </Button>
                </>
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
              <Button variant="outline" onClick={() => setCurrentStep(2)} data-testid="button-back-step2">
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
                <Button onClick={() => setCurrentStep(4)} className="flex-1" data-testid="button-continue-step4">
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
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
              <Button variant="outline" onClick={() => setCurrentStep(3)} data-testid="button-back-step3">
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

      {currentStep === 5 && (
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
              <Button variant="outline" onClick={() => setCurrentStep(4)} data-testid="button-back-step4">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending || !onboarding?.agreementSigned || !onboarding?.w9Signed}
                className="flex-1"
                data-testid="button-complete-onboarding"
              >
                {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Complete Onboarding
              </Button>
            </div>

            {(!onboarding?.agreementSigned || !onboarding?.w9Signed) && (
              <p className="text-sm text-destructive text-center">
                {!onboarding?.agreementSigned && !onboarding?.w9Signed
                  ? "Please complete the Agreement and W-9 steps before finishing onboarding"
                  : !onboarding?.agreementSigned
                  ? "Please sign the Subcontractor Agreement before finishing onboarding"
                  : "Please complete the W-9 step before finishing onboarding"}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
