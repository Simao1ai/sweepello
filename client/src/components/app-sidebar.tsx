import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  CreditCard,
  BarChart3,
  Sparkles,
  Calendar,
  CalendarPlus,
  ClipboardList,
  LogOut,
  Bell,
  Clock,
  ClipboardCheck,
  Home,
  HardHat,
  TrendingUp,
  DollarSign,
  Banknote,
  UserPlus,
  Star,
  AlertTriangle,
  Send,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { User, ContractorOnboarding, Notification } from "@shared/schema";

const adminNavItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Schedule", url: "/admin/schedule", icon: Calendar },
  { title: "Jobs", url: "/admin/jobs", icon: Briefcase },
  { title: "Cleaners", url: "/admin/cleaners", icon: Users },
  { title: "Clients", url: "/admin/clients", icon: Building2 },
  { title: "Payments", url: "/admin/payments", icon: CreditCard },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Applications", url: "/admin/applications", icon: UserPlus },
  { title: "Reviews", url: "/admin/reviews", icon: Star },
  { title: "Disputes", url: "/admin/disputes", icon: AlertTriangle },
  { title: "Broadcast", url: "/admin/broadcast", icon: Send },
];

const clientNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Bookings", url: "/my-bookings", icon: ClipboardList },
  { title: "Request Service", url: "/request-service", icon: CalendarPlus },
];

const contractorNavItems = [
  { title: "Dashboard", url: "/contractor/dashboard", icon: LayoutDashboard },
  { title: "My Jobs", url: "/contractor/jobs", icon: Briefcase },
  { title: "Availability", url: "/contractor/availability", icon: Clock },
  { title: "Notifications", url: "/contractor/notifications", icon: Bell },
  { title: "Earnings", url: "/contractor/earnings", icon: TrendingUp },
  { title: "Payouts", url: "/contractor/payouts", icon: Banknote },
];

const contractorOnboardingNavItems = [
  { title: "Complete Setup", url: "/contractor/onboarding", icon: ClipboardCheck },
];

const roleConfig = {
  admin: {
    label: "Admin Portal",
    sublabel: "Dispatch Management",
    groupLabel: "Management",
    accentClass: "bg-indigo-600 dark:bg-indigo-500",
    badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  client: {
    label: "Client Portal",
    sublabel: "Cleaning Services",
    groupLabel: "Services",
    accentClass: "bg-blue-600 dark:bg-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  contractor: {
    label: "Contractor Portal",
    sublabel: "Professional Cleaning",
    groupLabel: "Contractor",
    accentClass: "bg-emerald-600 dark:bg-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

const roleIcons = {
  admin: LayoutDashboard,
  client: Home,
  contractor: HardHat,
};

interface AppSidebarProps {
  role: "admin" | "client" | "contractor";
  user?: User | null;
}

export function AppSidebar({ role, user }: AppSidebarProps) {
  const [location] = useLocation();

  const { data: onboarding } = useQuery<ContractorOnboarding | null>({
    queryKey: ["/api/contractor/onboarding"],
    enabled: role === "contractor",
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: role === "contractor",
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const needsOnboarding = role === "contractor" && (!onboarding || onboarding.onboardingStatus !== "complete");
  const navItems = role === "admin"
    ? adminNavItems
    : role === "contractor"
      ? (needsOnboarding ? contractorOnboardingNavItems : contractorNavItems)
      : clientNavItems;

  const config = roleConfig[role];
  const RoleIcon = roleIcons[role];

  const initials = user
    ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() || "U"
    : "U";

  const defaultPath = role === "admin"
    ? "/admin"
    : role === "contractor"
      ? (needsOnboarding ? "/contractor/onboarding" : "/contractor/dashboard")
      : "/dashboard";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href={defaultPath} data-testid="link-home">
          <div className="flex items-center gap-2">
            <div>
              <h2
                className="text-lg font-bold leading-none sweepello-gradient"
                style={{ fontFamily: "'Pacifico', cursive" }}
              >
                Sweepello
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{config.sublabel}</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <RoleIcon className="h-3.5 w-3.5" />
            {config.groupLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && item.url.length > 1 && location.startsWith(item.url) && location.length <= item.url.length + 1);
                const showBadge = item.title === "Notifications" && unreadCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {showBadge && (
                          <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-xs justify-center bg-red-500/10 text-red-600 dark:text-red-400">
                            {unreadCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-user-name">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <a href="/api/logout" data-testid="button-logout">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </a>
        <div className="rounded-md bg-accent/50 p-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-xs ${config.badgeClass}`}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">NJ Shore Market</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
