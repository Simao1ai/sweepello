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
} from "lucide-react";
import { useLocation, Link } from "wouter";
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
import { Button } from "@/components/ui/button";
import type { User } from "@shared/schema";

const adminNavItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Schedule", url: "/admin/schedule", icon: Calendar },
  { title: "Jobs", url: "/admin/jobs", icon: Briefcase },
  { title: "Cleaners", url: "/admin/cleaners", icon: Users },
  { title: "Clients", url: "/admin/clients", icon: Building2 },
  { title: "Payments", url: "/admin/payments", icon: CreditCard },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
];

const clientNavItems = [
  { title: "My Bookings", url: "/my-bookings", icon: ClipboardList },
  { title: "Request Service", url: "/request-service", icon: CalendarPlus },
];

interface AppSidebarProps {
  role: "admin" | "client";
  user?: User | null;
}

export function AppSidebar({ role, user }: AppSidebarProps) {
  const [location] = useLocation();
  const navItems = role === "admin" ? adminNavItems : clientNavItems;
  const groupLabel = role === "admin" ? "Management" : "Services";

  const initials = user
    ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href={role === "admin" ? "/admin" : "/my-bookings"} data-testid="link-home">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">CleanSlate</h2>
              <p className="text-xs text-muted-foreground">
                {role === "admin" ? "Dispatch Platform" : "Client Portal"}
              </p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
          <p className="text-xs font-medium">NJ Shore Market</p>
          <p className="text-xs text-muted-foreground">Airbnb Turnover Focus</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
