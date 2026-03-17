import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Mail, HardHat, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UserProfile {
  role: string;
  approvalStatus: string | null;
}

export default function ContractorPending() {
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    refetchInterval: 30000,
  });

  const isRejected = profile?.approvalStatus === "rejected";

  const handleSignOut = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.clear();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Icon + Brand */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <span
              className="text-4xl font-bold sweepello-gradient"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              Sweepello
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isRejected ? "Application Not Approved" : "Application Under Review"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isRejected
              ? "Unfortunately we were unable to approve your contractor account at this time."
              : "Your account has been received and is being reviewed by our team."}
          </p>
        </div>

        <Card className={`border-2 shadow-md ${isRejected ? "border-red-200 bg-red-50 dark:bg-red-950/20" : "border-emerald-200 bg-white dark:bg-card"}`}>
          <CardContent className="p-8 space-y-6">
            {isRejected ? (
              <div className="text-center space-y-4">
                <XCircle className="h-14 w-14 text-red-500 mx-auto" data-testid="icon-rejected" />
                <div>
                  <p className="font-semibold text-lg text-red-700 dark:text-red-400">Not Approved</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    After reviewing your application, we were unable to approve your account at this time.
                    This may be due to service area availability, capacity limits, or other factors.
                  </p>
                </div>
                <div className="bg-red-100 dark:bg-red-950/40 rounded-lg p-4 text-sm text-red-800 dark:text-red-300">
                  If you believe this was an error or have questions, please contact us at{" "}
                  <a href="mailto:support@sweepello.com" className="font-semibold underline">
                    support@sweepello.com
                  </a>
                </div>
              </div>
            ) : (
              <>
                {/* Status indicator */}
                <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="relative">
                    <Clock className="h-10 w-10 text-emerald-600" data-testid="icon-pending" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">Under Review</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Usually 1–2 business days</p>
                  </div>
                </div>

                {/* What happens next */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">What happens next:</p>
                  <div className="space-y-3">
                    {[
                      { icon: CheckCircle, color: "text-emerald-600", text: "Our team reviews your account information" },
                      { icon: CheckCircle, color: "text-emerald-600", text: "We verify your service area and availability" },
                      { icon: Mail, color: "text-blue-600", text: "You'll receive an email notification once approved" },
                      { icon: CheckCircle, color: "text-emerald-600", text: "Complete a quick onboarding and start receiving jobs!" },
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <step.icon className={`h-4 w-4 mt-0.5 shrink-0 ${step.color}`} />
                        <p className="text-sm text-muted-foreground">{step.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email reminder */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 flex items-start gap-3 border border-blue-200 dark:border-blue-800">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Check your inbox</p>
                    <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                      We'll send you an email when your account is approved. Make sure to check your spam folder too.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleSignOut}
            data-testid="button-sign-out"
          >
            Sign Out
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Questions? Contact us at{" "}
          <a href="mailto:support@sweepello.com" className="underline hover:text-foreground">
            support@sweepello.com
          </a>
        </p>
      </div>
    </div>
  );
}
