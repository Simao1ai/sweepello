import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, ArrowDownLeft, ArrowUpRight, CreditCard } from "lucide-react";
import type { Payment, Job } from "@shared/schema";

export default function Payments() {
  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });
  const { data: jobs } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });

  const totalIncoming = payments
    ?.filter((p) => p.type === "incoming")
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const totalOutgoing = payments
    ?.filter((p) => p.type === "outgoing")
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const pendingPayments = payments?.filter((p) => p.status === "pending") || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Payments</h1>
        <p className="text-muted-foreground">Track incoming revenue and cleaner payouts</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Incoming</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-incoming">
              ${totalIncoming.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">from clients</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outgoing</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-outgoing">
              ${totalOutgoing.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">to cleaners</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-net-profit">
              ${(totalIncoming - totalOutgoing).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalIncoming > 0
                ? `${(((totalIncoming - totalOutgoing) / totalIncoming) * 100).toFixed(1)}% margin`
                : "No payments yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : payments?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const job = jobs?.find((j) => j.id === payment.jobId);
                    return (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {payment.type === "incoming" ? (
                              <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                            <span className="text-sm capitalize">{payment.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className={payment.type === "incoming" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {payment.type === "incoming" ? "+" : "-"}${Number(payment.amount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {job?.propertyAddress || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "completed" ? "default" : "outline"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground text-nowrap">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "Pending"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No payments yet</p>
              <p className="text-xs text-muted-foreground mt-1">Payments appear when jobs are completed</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
