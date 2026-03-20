import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, User, Shield, Wrench } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DevUser {
  id: string;
  name: string;
  email: string;
  role: string;
  approvalStatus: string | null;
}

const roleColors: Record<string, string> = {
  admin: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  client: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  contractor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

const roleIcons: Record<string, any> = {
  admin: Shield,
  client: User,
  contractor: Wrench,
};

export default function DevLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<DevUser[]>({
    queryKey: ["/api/dev/users"],
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dev/logout"),
    onSuccess: () => {
      queryClient.clear();
      toast({ title: "Logged out" });
    },
  });

  const loginAs = async (userId: string) => {
    setSwitching(userId);
    try {
      await apiRequest("POST", "/api/dev/login", { userId });
      queryClient.clear();
      navigate("/");
      window.location.reload();
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message, variant: "destructive" });
      setSwitching(null);
    }
  };

  const grouped = (users || []).reduce<Record<string, DevUser[]>>((acc, u) => {
    (acc[u.role] = acc[u.role] || []).push(u);
    return acc;
  }, {});

  const roleOrder = ["admin", "client", "contractor"];

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1 text-xs font-medium mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Development Mode Only
          </div>
          <h1 className="text-2xl font-bold">Dev Login Switcher</h1>
          <p className="text-sm text-muted-foreground mt-1">Switch between test accounts instantly</p>
        </div>

        <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 border-b flex justify-between items-center bg-muted/30">
            <span className="text-xs text-muted-foreground">Current session</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-dev-logout"
            >
              {logoutMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
              Log Out
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y">
              {roleOrder.filter(r => grouped[r]?.length).map(role => {
                const Icon = roleIcons[role] || User;
                return (
                  <div key={role} className="p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Icon className="h-3 w-3" /> {role}
                    </p>
                    <div className="space-y-1.5">
                      {grouped[role].map(u => (
                        <button
                          key={u.id}
                          onClick={() => loginAs(u.id)}
                          disabled={!!switching}
                          data-testid={`button-login-as-${u.id}`}
                          className="w-full flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                        >
                          <div>
                            <p className="text-sm font-medium">{u.name || u.id}</p>
                            <p className="text-xs text-muted-foreground">{u.email || u.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {u.approvalStatus === "pending" && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">pending</Badge>
                            )}
                            {switching === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            ) : (
                              <Badge className={`text-xs px-1.5 py-0 ${roleColors[u.role] || ""}`}>
                                {u.role}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground text-center">
              This page is only available in development and is hidden in production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
