import { Switch, Route, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Jobs from "@/pages/jobs";
import Cleaners from "@/pages/cleaners";
import Clients from "@/pages/clients";
import Payments from "@/pages/payments";
import Analytics from "@/pages/analytics";
import Schedule from "@/pages/schedule";
import RequestService from "@/pages/request-service";
import MyBookings from "@/pages/my-bookings";
import RateService from "@/pages/rate-service";
import ContractorJobs from "@/pages/contractor-jobs";
import ContractorAvailability from "@/pages/contractor-availability";
import ContractorNotifications from "@/pages/contractor-notifications";
import ContractorOnboarding from "@/pages/contractor-onboarding";
import type { UserProfile, ContractorOnboarding as ContractorOnboardingType } from "@shared/schema";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/schedule" component={Schedule} />
      <Route path="/admin/jobs" component={Jobs} />
      <Route path="/admin/cleaners" component={Cleaners} />
      <Route path="/admin/clients" component={Clients} />
      <Route path="/admin/payments" component={Payments} />
      <Route path="/admin/analytics" component={Analytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClientRouter() {
  return (
    <Switch>
      <Route path="/my-bookings" component={MyBookings} />
      <Route path="/request-service" component={RequestService} />
      <Route path="/rate/:id" component={RateService} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const role = profile?.role === "admin" ? "admin" : profile?.role === "contractor" ? "contractor" : "client";

  const { data: onboarding, isLoading: onboardingLoading } = useQuery<ContractorOnboardingType | null>({
    queryKey: ["/api/contractor/onboarding"],
    enabled: role === "contractor",
  });

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (profileLoading || (role === "contractor" && onboardingLoading)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  const needsOnboarding = role === "contractor" && (!onboarding || onboarding.onboardingStatus !== "complete");
  const defaultPath = role === "admin" ? "/admin" : role === "contractor" ? (needsOnboarding ? "/contractor/onboarding" : "/contractor/jobs") : "/my-bookings";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar role={role} user={user} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 p-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/">
                <Redirect to={defaultPath} />
              </Route>
              {role === "admin" && (
                <>
                  <Route path="/admin" component={Dashboard} />
                  <Route path="/admin/schedule" component={Schedule} />
                  <Route path="/admin/jobs" component={Jobs} />
                  <Route path="/admin/cleaners" component={Cleaners} />
                  <Route path="/admin/clients" component={Clients} />
                  <Route path="/admin/payments" component={Payments} />
                  <Route path="/admin/analytics" component={Analytics} />
                </>
              )}
              {role === "contractor" && (
                <>
                  <Route path="/contractor/onboarding" component={ContractorOnboarding} />
                  {needsOnboarding ? (
                    <Route path="/contractor/:rest*">
                      <Redirect to="/contractor/onboarding" />
                    </Route>
                  ) : (
                    <>
                      <Route path="/contractor/jobs" component={ContractorJobs} />
                      <Route path="/contractor/availability" component={ContractorAvailability} />
                      <Route path="/contractor/notifications" component={ContractorNotifications} />
                    </>
                  )}
                </>
              )}
              {role === "client" && (
                <>
                  <Route path="/my-bookings" component={MyBookings} />
                  <Route path="/request-service" component={RequestService} />
                  <Route path="/rate/:id" component={RateService} />
                </>
              )}
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <AuthenticatedApp />;
}

export default App;
