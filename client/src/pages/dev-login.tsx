import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, User, Shield, Wrench, CheckCircle2 } from "lucide-react";
import { DEV_USER_KEY, queryClient } from "@/lib/queryClient";
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
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  useEffect(() => {
    setActiveUserId(localStorage.getItem(DEV_USER_KEY));
  }, []);

  const { data: users, isLoading } = useQuery<DevUser[]>({
    queryKey: ["/api/dev/users"],
    queryFn: async () => {
      const res = await fetch("/api/dev/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const loginAs = (userId: string, name: string) => {
    localStorage.setItem(DEV_USER_KEY, userId);
    setActiveUserId(userId);
    queryClient.clear();
    toast({ title: `Switched to ${name}` });
    navigate("/");
    window.location.reload();
  };

  const logout = () => {
    localStorage.removeItem(DEV_USER_KEY);
    setActiveUserId(null);
    queryClient.clear();
    toast({ title: "Dev session cleared — using Replit Auth" });
    navigate("/");
    window.location.reload();
  };

  const grouped = (users || []).reduce<Record<string, DevUser[]>>((acc, u) => {
    (acc[u.role] = acc[u.role] || []).push(u);
    return acc;
  }, {});

  const roleOrder = ["admin", "client", "contractor"];
  const activeUser = users?.find(u => u.id === activeUserId);

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
            <div className="text-xs text-muted-foreground">
              {activeUser
                ? <span>Logged in as <strong>{activeUser.name}</strong></span>
                : <span>Using Replit Auth (your real account)</span>
              }
            </div>
            {activeUserId && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={logout}
                data-testid="button-dev-logout"
              >
                <LogOut className="h-3 w-3" />
                Clear Dev Session
              </Button>
            )}
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
                          onClick={() => loginAs(u.id, u.name)}
                          data-testid={`button-login-as-${u.id}`}
                          className="w-full flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-medium">{u.name || u.id}</p>
                            <p className="text-xs text-muted-foreground">{u.email || u.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {u.approvalStatus === "pending" && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">pending</Badge>
                            )}
                            {activeUserId === u.id ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
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
              Session stored in browser — only works in development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
