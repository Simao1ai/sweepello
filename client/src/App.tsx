import { Switch, Route, Redirect, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminAiAgent } from "@/components/admin-ai-agent";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
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
import Tracking from "@/pages/tracking";
import ContractorJobs from "@/pages/contractor-jobs";
import ContractorAvailability from "@/pages/contractor-availability";
import ContractorNotifications from "@/pages/contractor-notifications";
import ContractorOnboarding from "@/pages/contractor-onboarding";
import ContractorApply from "@/pages/contractor-apply";
import ContractorPayouts from "@/pages/contractor-payouts";
import ContractorPending from "@/pages/contractor-pending";
import Applications from "@/pages/admin/applications";
import ReviewModeration from "@/pages/admin/review-moderation";
import Disputes from "@/pages/admin/disputes";
import Broadcast from "@/pages/admin/broadcast";
import AiUsage from "@/pages/admin/ai-usage";
import DevLogin from "@/pages/dev-login";
import type { UserProfile, ContractorOnboarding as ContractorOnboardingType } from "@shared/schema";

function DevSwitcher() {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => navigate("/dev-login")}
      data-testid="button-dev-switcher"
      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-500/20 transition-colors"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Dev
    </button>
  );
}

function FloatingDevButton() {
  const [location, navigate] = useLocation();
  if (location === "/dev-login") return null;
  return (
    <button
      onClick={() => navigate("/dev-login")}
      data-testid="button-floating-dev"
      className="fixed bottom-4 left-4 z-[9999] flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg bg-amber-400 hover:bg-amber-500 text-amber-950 transition-colors"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-900/50 animate-pulse" />
      Dev Login
    </button>
  );
}

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
    const status = (profile as any).approvalStatus;
    if (status === "pending" || status === "rejected") {
      return <ContractorPending />;
    }
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
            <div className="flex items-center gap-2"><DevSwitcher /><ThemeToggle /></div>
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
              <Route path="/admin/applications" component={Applications} />
              <Route path="/admin/reviews" component={ReviewModeration} />
              <Route path="/admin/disputes" component={Disputes} />
              <Route path="/admin/broadcast" component={Broadcast} />
              <Route path="/admin/ai-usage" component={AiUsage} />
              <Route component={NotFound} />
            </Switch>
          </main>
          <AdminAiAgent />
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
            <div className="flex items-center gap-2"><DevSwitcher /><ThemeToggle /></div>
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
              <Route path="/tracking/:id" component={Tracking} />
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
            <div className="flex items-center gap-2"><DevSwitcher /><ThemeToggle /></div>
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
                  <Route path="/contractor/payouts" component={ContractorPayouts} />
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
          <FloatingDevButton />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (location === "/apply") {
    return <ContractorApply />;
  }

  if (location === "/dev-login") {
    return <DevLogin />;
  }

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
    return (
      <Switch>
        <Route path="/apply" component={ContractorApply} />
        <Route path="/login" component={Login} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return <AuthenticatedApp />;
}

export default App;
