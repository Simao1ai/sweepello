import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Banknote,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Percent,
  CreditCard,
  TrendingUp,
  Clock,
  Building2,
} from "lucide-react";

interface PayoutData {
  stripeStatus: {
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    balance: any;
  };
  payoutHistory: {
    jobId: string;
    propertyAddress: string;
    scheduledDate: string;
    clientTotal: number;
    cleanSlateMargin: number;
    yourPayout: number;
    marginPercent: number;
    status: string;
  }[];
  summary: {
    totalEarned: number;
    totalClientRevenue: number;
    totalJobs: number;
    avgMarginPercent: number;
  };
  stripeAccountId: string | null;
}

export default function ContractorPayouts() {
  const { toast } = useToast();
  const [location] = useLocation();

  const { data, isLoading } = useQuery<PayoutData>({
    queryKey: ["/api/contractor/payouts"],
  });

  useEffect(() => {
    if (location.includes("connected=true")) {
      toast({ title: "Bank account connected!", description: "Your payout account is now set up." });
      queryClient.invalidateQueries({ queryKey: ["/api/contractor/payouts"] });
    }
  }, [location]);

  const connectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/contractor/payouts/connect"),
    onSuccess: async (res) => {
      const data = await res.json();
      window.location.href = data.url;
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const dashboardMutation = useMutation({
    mutationFn: () => apiRequest("GET", "/api/contractor/payouts/dashboard-link"),
    onSuccess: async (res) => {
      const data = await res.json();
      window.open(data.url, "_blank");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const stripe = data?.stripeStatus;
  const isFullyConnected = stripe?.connected && stripe?.payoutsEnabled && stripe?.detailsSubmitted;
  const availableBalance = stripe?.balance?.available?.[0]?.amount
    ? (stripe.balance.available[0].amount / 100).toFixed(2)
    : null;
  const pendingBalance = stripe?.balance?.pending?.[0]?.amount
    ? (stripe.balance.pending[0].amount / 100).toFixed(2)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-payouts-title">Payouts</h1>
        <p className="text-muted-foreground">Your earnings, payout account, and payment history</p>
      </div>

      {/* Bank Account Connection Banner */}
      {!isLoading && (
        <Card className={`border-2 ${isFullyConnected ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" : "border-amber-300 bg-amber-50 dark:bg-amber-950/30"}`} data-testid="card-stripe-status">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                {isFullyConnected
                  ? <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 shrink-0" />
                  : <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5 shrink-0" />
                }
                <div>
                  <p className="font-semibold text-sm" data-testid="text-stripe-status">
                    {isFullyConnected ? "Payout account connected" : stripe?.connected && stripe?.detailsSubmitted ? "Account setup incomplete" : "No payout account connected"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isFullyConnected
                      ? "Your bank account is set up. CleanSlate will transfer your earnings directly."
                      : stripe?.connected
                      ? "Finish setting up your Stripe account to receive payouts."
                      : "Connect your bank account to receive direct deposit payouts after each job."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {isFullyConnected ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700"
                    onClick={() => dashboardMutation.mutate()}
                    disabled={dashboardMutation.isPending}
                    data-testid="button-manage-bank"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    {dashboardMutation.isPending ? "Loading..." : "Manage Bank Account"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                    data-testid="button-connect-bank"
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    {connectMutation.isPending ? "Redirecting..." : stripe?.connected ? "Complete Setup" : "Connect Bank Account"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card data-testid="card-total-earned">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">Total Earned</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600" data-testid="text-total-earned">
                  ${data?.summary.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{data?.summary.totalJobs} completed jobs</p>
              </CardContent>
            </Card>

            <Card data-testid="card-available-balance">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-available-balance">
                  {isFullyConnected && availableBalance !== null ? `$${availableBalance}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">in your Stripe account</p>
              </CardContent>
            </Card>

            <Card data-testid="card-pending-balance">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-pending-balance">
                  {isFullyConnected && pendingBalance !== null ? `$${pendingBalance}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">processing by Stripe</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-revenue">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-muted-foreground">Client Revenue</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-client-revenue">
                  ${data?.summary.totalClientRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">total billed to clients</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* How It Works — Uber-style breakdown */}
      <Card data-testid="card-fee-breakdown">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-muted-foreground" />
            How CleanSlate Payouts Work
          </CardTitle>
          <CardDescription>Transparent brokerage model — you always see exactly how it's split</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch gap-0">
            <div className="flex-1 bg-blue-50 dark:bg-blue-950/30 rounded-l-lg p-4 text-center border border-blue-200 dark:border-blue-800">
              <Building2 className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">Client pays</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">100%</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Full service price</p>
            </div>
            <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-3 border-y border-gray-200 dark:border-gray-700">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 bg-indigo-50 dark:bg-indigo-950/30 p-4 text-center border-y border-indigo-200 dark:border-indigo-800">
              <Percent className="h-6 w-6 text-indigo-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">CleanSlate retains</p>
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">30%</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">Dispatch & platform fee</p>
            </div>
            <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-3 border-y border-gray-200 dark:border-gray-700">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-r-lg p-4 text-center border border-emerald-200 dark:border-emerald-800">
              <DollarSign className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">You receive</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">70%</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Direct deposit via Stripe</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Payouts are initiated automatically after job completion. Stripe typically deposits funds within 2 business days.
          </p>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Payout History
          </CardTitle>
          <CardDescription>A breakdown of every job payment showing the fee split</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !data?.payoutHistory.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No payouts yet. Complete your first job to see the breakdown here.</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-4">Property</div>
                <div className="col-span-2 text-right">Date</div>
                <div className="col-span-2 text-right">Client Paid</div>
                <div className="col-span-2 text-right text-indigo-600">CS Fee (30%)</div>
                <div className="col-span-2 text-right text-emerald-600">Your Pay</div>
              </div>
              {data.payoutHistory.map((payout) => (
                <div
                  key={payout.jobId}
                  className="grid grid-cols-12 gap-2 px-3 py-3 hover:bg-muted/30 transition-colors text-sm"
                  data-testid={`row-payout-${payout.jobId}`}
                >
                  <div className="col-span-4 font-medium truncate" title={payout.propertyAddress}>
                    {payout.propertyAddress}
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground text-xs">
                    {new Date(payout.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div className="col-span-2 text-right font-medium">
                    ${payout.clientTotal.toFixed(2)}
                  </div>
                  <div className="col-span-2 text-right text-indigo-600 dark:text-indigo-400">
                    −${payout.cleanSlateMargin.toFixed(2)}
                  </div>
                  <div className="col-span-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    ${payout.yourPayout.toFixed(2)}
                  </div>
                </div>
              ))}
              {/* Totals row */}
              <div className="grid grid-cols-12 gap-2 px-3 py-3 bg-muted/30 text-sm font-semibold rounded-b-lg">
                <div className="col-span-4">Total ({data.payoutHistory.length} jobs)</div>
                <div className="col-span-2" />
                <div className="col-span-2 text-right">${data.summary.totalClientRevenue.toFixed(2)}</div>
                <div className="col-span-2 text-right text-indigo-600">
                  −${(data.summary.totalClientRevenue - data.summary.totalEarned).toFixed(2)}
                </div>
                <div className="col-span-2 text-right text-emerald-600">${data.summary.totalEarned.toFixed(2)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Note */}
      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Tax Information</p>
        <p>As an independent 1099 contractor, you are responsible for your own taxes. CleanSlate does not withhold taxes from your payouts. You will receive a 1099-NEC form if your total earnings exceed $600 in a calendar year.</p>
        <p>We recommend setting aside 25–30% of your earnings for federal and state taxes. Consult a tax professional for personalized advice.</p>
      </div>
    </div>
  );
}
