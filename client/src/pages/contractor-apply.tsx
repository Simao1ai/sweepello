import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle, ArrowLeft, ArrowRight, User, Briefcase, Building2, Clock, FileText } from "lucide-react";
import { Link } from "wouter";

const step1Schema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid phone required"),
  city: z.string().min(1, "City required"),
  zipCode: z.string().min(5, "Zip code required"),
  serviceZipCodes: z.string().min(1, "At least one service zip code required"),
});

const step2Schema = z.object({
  yearsExperience: z.coerce.number().min(0, "Required"),
  cleaningTypes: z.array(z.string()).min(1, "Select at least one type"),
  references: z.string().optional(),
});

const step3Schema = z.object({
  isInsured: z.boolean(),
  hasOwnSupplies: z.boolean(),
});

const step4Schema = z.object({
  availableDays: z.array(z.string()).min(1, "Select at least one day"),
  availableHours: z.string().min(1, "Available hours required"),
});

const step5Schema = z.object({
  agreementAcknowledged: z.literal(true, { errorMap: () => ({ message: "You must acknowledge the agreement" }) }),
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CLEANING_TYPES = ["Residential", "Airbnb / Vacation Rental", "Commercial", "Move-In/Move-Out", "Deep Clean"];

const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Experience", icon: Briefcase },
  { label: "Business Info", icon: Building2 },
  { label: "Availability", icon: Clock },
  { label: "Agreement", icon: FileText },
];

export default function ContractorApply() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    cleaningTypes: [],
    availableDays: [],
    isInsured: false,
    hasOwnSupplies: false,
    agreementAcknowledged: false,
  });

  const currentSchema = [step1Schema, step2Schema, step3Schema, step4Schema, step5Schema][step - 1];

  const form = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: formData,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        cleaningTypes: Array.isArray(data.cleaningTypes) ? data.cleaningTypes.join(", ") : (data.cleaningTypes || ""),
        availableDays: Array.isArray(data.availableDays) ? data.availableDays.join(", ") : (data.availableDays || ""),
        yearsExperience: parseInt(data.yearsExperience, 10) || 0,
      };
      return apiRequest("POST", "/api/contractor-applications", payload);
    },
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => toast({ title: "Submission failed", description: err.message, variant: "destructive" }),
  });

  const handleNext = form.handleSubmit((values) => {
    const merged = { ...formData, ...values };
    setFormData(merged);
    if (step < 5) {
      setStep(step + 1);
      form.reset({ ...merged });
    } else {
      submitMutation.mutate(merged);
    }
  });

  const handleBack = () => {
    setStep(s => s - 1);
    form.reset(formData);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-xl">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold">Application Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you for applying to join the Sweepello network. Our team will review your application and reach out to you via email within 3–5 business days.
            </p>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              Status: Under Review
            </Badge>
            <div className="pt-4">
              <Link href="/">
                <Button variant="outline" className="w-full">Return to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((step - 1) / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 pt-8">
          <Link href="/">
            <div className="flex items-center justify-center mb-4">
              <span
                className="text-4xl font-bold sweepello-gradient"
                style={{ fontFamily: "'Pacifico', cursive" }}
              >
                Sweepello
              </span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contractor Application</h1>
          <p className="text-muted-foreground mt-2">Join our network of professional cleaners in the NJ Shore market</p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isComplete = i + 1 < step;
              const isCurrent = i + 1 === step;
              return (
                <div key={s.label} className="flex flex-col items-center gap-1" data-testid={`step-indicator-${i + 1}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${isComplete ? "bg-emerald-600 text-white" : isCurrent ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                    {isComplete ? <CheckCircle className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs hidden sm:block ${isCurrent ? "text-emerald-700 font-medium" : "text-gray-400"}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => { const S = STEPS[step - 1].icon; return <S className="h-5 w-5 text-emerald-600" />; })()}
              Step {step} of 5 — {STEPS[step - 1].label}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Tell us a bit about yourself and where you're located."}
              {step === 2 && "Share your cleaning experience and references."}
              {step === 3 && "Tell us about your business setup."}
              {step === 4 && "Let us know when you're generally available."}
              {step === 5 && "Review and acknowledge the independent contractor terms."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNext} className="space-y-4">

              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" data-testid="input-first-name" {...form.register("firstName")} placeholder="Jane" />
                      {form.formState.errors.firstName && <p className="text-xs text-red-500">{String(form.formState.errors.firstName.message)}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" data-testid="input-last-name" {...form.register("lastName")} placeholder="Smith" />
                      {form.formState.errors.lastName && <p className="text-xs text-red-500">{String(form.formState.errors.lastName.message)}</p>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" data-testid="input-email" {...form.register("email")} placeholder="jane@email.com" />
                    {form.formState.errors.email && <p className="text-xs text-red-500">{String(form.formState.errors.email.message)}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" data-testid="input-phone" {...form.register("phone")} placeholder="(732) 555-0100" />
                    {form.formState.errors.phone && <p className="text-xs text-red-500">{String(form.formState.errors.phone.message)}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" data-testid="input-city" {...form.register("city")} placeholder="Toms River" />
                      {form.formState.errors.city && <p className="text-xs text-red-500">{String(form.formState.errors.city.message)}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="zipCode">Your Zip Code</Label>
                      <Input id="zipCode" data-testid="input-zip-code" {...form.register("zipCode")} placeholder="08753" />
                      {form.formState.errors.zipCode && <p className="text-xs text-red-500">{String(form.formState.errors.zipCode.message)}</p>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="serviceZipCodes">Zip Codes You Can Service</Label>
                    <Input id="serviceZipCodes" data-testid="input-service-zip-codes" {...form.register("serviceZipCodes")} placeholder="08753, 08701, 08723 (comma separated)" />
                    <p className="text-xs text-muted-foreground">Enter all zip codes you're willing to travel to for jobs.</p>
                    {form.formState.errors.serviceZipCodes && <p className="text-xs text-red-500">{String(form.formState.errors.serviceZipCodes.message)}</p>}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="yearsExperience">Years of Cleaning Experience</Label>
                    <Input id="yearsExperience" type="number" min={0} data-testid="input-years-experience" {...form.register("yearsExperience")} placeholder="3" />
                    {form.formState.errors.yearsExperience && <p className="text-xs text-red-500">{String(form.formState.errors.yearsExperience.message)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Types of Cleaning You Do</Label>
                    {CLEANING_TYPES.map(type => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={`type-${type}`}
                          data-testid={`checkbox-cleaning-type-${type.toLowerCase().replace(/\s/g, "-")}`}
                          checked={(form.watch("cleaningTypes") || []).includes(type)}
                          onCheckedChange={(checked) => {
                            const current = form.getValues("cleaningTypes") || [];
                            form.setValue("cleaningTypes", checked ? [...current, type] : current.filter((t: string) => t !== type));
                          }}
                        />
                        <Label htmlFor={`type-${type}`} className="font-normal cursor-pointer">{type}</Label>
                      </div>
                    ))}
                    {form.formState.errors.cleaningTypes && <p className="text-xs text-red-500">{String(form.formState.errors.cleaningTypes.message)}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="references">References (Optional)</Label>
                    <Textarea id="references" data-testid="textarea-references" {...form.register("references")} placeholder="Name, phone, or company — list any professional references you have" rows={3} />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <Checkbox
                        id="isInsured"
                        data-testid="checkbox-is-insured"
                        checked={form.watch("isInsured")}
                        onCheckedChange={(checked) => form.setValue("isInsured", !!checked)}
                      />
                      <div>
                        <Label htmlFor="isInsured" className="font-medium cursor-pointer">I carry liability insurance</Label>
                        <p className="text-xs text-muted-foreground mt-1">Recommended but not required to apply. You'll provide policy details during onboarding.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <Checkbox
                        id="hasOwnSupplies"
                        data-testid="checkbox-has-own-supplies"
                        checked={form.watch("hasOwnSupplies")}
                        onCheckedChange={(checked) => form.setValue("hasOwnSupplies", !!checked)}
                      />
                      <div>
                        <Label htmlFor="hasOwnSupplies" className="font-medium cursor-pointer">I have my own cleaning supplies & equipment</Label>
                        <p className="text-xs text-muted-foreground mt-1">Vacuum, mop, cleaning products, etc.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Neither of the above is required to apply. We evaluate all applicants holistically based on experience, professionalism, and availability.
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="space-y-2">
                    <Label>Days You're Generally Available</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DAYS.map(day => (
                        <div key={day} className="flex items-center gap-2">
                          <Checkbox
                            id={`day-${day}`}
                            data-testid={`checkbox-day-${day.toLowerCase()}`}
                            checked={(form.watch("availableDays") || []).includes(day)}
                            onCheckedChange={(checked) => {
                              const current = form.getValues("availableDays") || [];
                              form.setValue("availableDays", checked ? [...current, day] : current.filter((d: string) => d !== day));
                            }}
                          />
                          <Label htmlFor={`day-${day}`} className="font-normal cursor-pointer">{day}</Label>
                        </div>
                      ))}
                    </div>
                    {form.formState.errors.availableDays && <p className="text-xs text-red-500">{String(form.formState.errors.availableDays.message)}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="availableHours">Available Hours</Label>
                    <Input id="availableHours" data-testid="input-available-hours" {...form.register("availableHours")} placeholder="e.g. 8am – 5pm, flexible" />
                    {form.formState.errors.availableHours && <p className="text-xs text-red-500">{String(form.formState.errors.availableHours.message)}</p>}
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4 space-y-3 text-sm text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto">
                    <p className="font-semibold">Independent Contractor Acknowledgment</p>
                    <p>By submitting this application, you acknowledge and understand that:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>You will operate as an <strong>independent contractor</strong>, not an employee of Sweepello.</li>
                      <li>You are responsible for your own taxes as a 1099 contractor.</li>
                      <li>Sweepello acts as a <strong>dispatch broker</strong> connecting you with clients.</li>
                      <li>You are free to accept or decline any job offers.</li>
                      <li>Your approval is not guaranteed and Sweepello reserves the right to reject any application.</li>
                      <li>Approved contractors will complete a full onboarding process including a W-9 and subcontractor agreement before receiving any assignments.</li>
                    </ul>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                    <Checkbox
                      id="agreementAcknowledged"
                      data-testid="checkbox-agreement"
                      checked={form.watch("agreementAcknowledged")}
                      onCheckedChange={(checked) => form.setValue("agreementAcknowledged", !!checked)}
                    />
                    <div>
                      <Label htmlFor="agreementAcknowledged" className="font-medium cursor-pointer">
                        I have read and understand the above terms
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        You will sign the full subcontractor agreement and W-9 during onboarding if approved.
                      </p>
                    </div>
                  </div>
                  {form.formState.errors.agreementAcknowledged && <p className="text-xs text-red-500">{String(form.formState.errors.agreementAcknowledged.message)}</p>}
                </>
              )}

              <div className="flex gap-3 pt-4">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack} data-testid="button-back" className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                )}
                <Button type="submit" data-testid="button-next" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={submitMutation.isPending}>
                  {step === 5 ? (submitMutation.isPending ? "Submitting..." : "Submit Application") : <><span>Next</span> <ArrowRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already approved?{" "}
          <a href="/api/login" className="text-emerald-600 font-medium hover:underline">Sign in here</a>
        </p>
      </div>
    </div>
  );
}
