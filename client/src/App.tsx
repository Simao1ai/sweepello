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
import RoleSelection from "@/pages/role-selection";
import Dashboard from "@/pages/dashboard";
import ClientDashboard from "@/pages/client-dashboard";
import ContractorDashboard from "@/pages/contractor-dashboard";
import ContractorEarnings from "@/pages/contractor-earnings";
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

function AuthenticatedApp() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <RoleSelection />;
  }

  const role = profile.role === "admin" ? "admin" : profile.role === "contractor" ? "contractor" : "client";

  if (role === "contractor") {
    return <ContractorApp user={user} />;
  }

  if (role === "admin") {
    return <AdminApp user={user} />;
  }

  return <ClientApp user={user} />;
}

function AdminApp({ user }: { user: any }) {
  const style = { "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar role="admin" user={user} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 p-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/">
                <Redirect to="/admin" />
              </Route>
              <Route path="/admin" component={Dashboard} />
              <Route path="/admin/schedule" component={Schedule} />
              <Route path="/admin/jobs" component={Jobs} />
              <Route path="/admin/cleaners" component={Cleaners} />
              <Route path="/admin/clients" component={Clients} />
              <Route path="/admin/payments" component={Payments} />
              <Route path="/admin/analytics" component={Analytics} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ClientApp({ user }: { user: any }) {
  const style = { "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar role="client" user={user} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 p-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/">
                <Redirect to="/dashboard" />
              </Route>
              <Route path="/dashboard" component={ClientDashboard} />
              <Route path="/my-bookings" component={MyBookings} />
              <Route path="/request-service" component={RequestService} />
              <Route path="/rate/:id" component={RateService} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ContractorApp({ user }: { user: any }) {
  const { data: onboarding, isLoading: onboardingLoading } = useQuery<ContractorOnboardingType | null>({
    queryKey: ["/api/contractor/onboarding"],
  });

  const style = { "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" };

  if (onboardingLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  const needsOnboarding = !onboarding || onboarding.onboardingStatus !== "complete";
  const defaultPath = needsOnboarding ? "/contractor/onboarding" : "/contractor/dashboard";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar role="contractor" user={user} />
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
              <Route path="/contractor/onboarding" component={ContractorOnboarding} />
              {needsOnboarding ? (
                <Route path="/contractor/:rest*">
                  <Redirect to="/contractor/onboarding" />
                </Route>
              ) : (
                <>
                  <Route path="/contractor/dashboard" component={ContractorDashboard} />
                  <Route path="/contractor/jobs" component={ContractorJobs} />
                  <Route path="/contractor/availability" component={ContractorAvailability} />
                  <Route path="/contractor/notifications" component={ContractorNotifications} />
                  <Route path="/contractor/earnings" component={ContractorEarnings} />
                </>
              )}
              <Route component={NotFound} />
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
