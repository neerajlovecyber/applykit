import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQueueStore } from "@/app/stores/queue-store";
import { useProfileStore } from "@/app/stores/profile-store";
import { useConveyor } from "@/app/hooks/use-conveyor";
import {
  LayoutDashboard,
  ListTodo,
  Compass,
  UserCheck,
  FileCheck,
  BrainCircuit,
  History,
  Settings,
  Play,
  Pause,
  Briefcase,
  ChevronDown,
  Sparkles,
  Rocket,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  SidebarProvider,
  SidebarInset,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarSeparator,
} from "@/app/components/ui/sidebar";
import { RoleOnboardingWizard } from "@/app/components/RoleOnboardingWizard";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/auto-apply", label: "Auto-Apply Hub", icon: Rocket },
  { path: "/queue", label: "Job Queue", icon: ListTodo },
  { path: "/profiles", label: "Role Profiles", icon: UserCheck },
  { path: "/documents", label: "Documents", icon: FileCheck },
  { path: "/qabank", label: "QA Memory", icon: BrainCircuit },
  { path: "/history", label: "History", icon: History },
];

const allNavItems = [...mainNavItems, { path: "/settings", label: "Settings", icon: Settings }];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const conveyor = useConveyor();
  const { isRunning, pendingCount, startQueue, pauseQueue } = useQueueStore();
  const { activeProfile, profiles, setProfiles, setActiveProfile } = useProfileStore();

  const [showWizard, setShowWizard] = useState(false);

  // Load profiles on mount
  useEffect(() => {
    const initProfiles = async () => {
      try {
        const list = await conveyor.data.getProfiles();
        setProfiles(list);
        const active = list.find((p) => p.is_active === 1) || list[0] || null;
        if (active) setActiveProfile(active);

        // Auto-prompt wizard if no profiles exist
        if (!list || list.length === 0) {
          setShowWizard(true);
        }
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
    };
    initProfiles();
  }, []);

  return (
    <SidebarProvider
      className="web3-dashboard bg-background text-foreground min-h-screen font-sans select-none overflow-hidden"
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}
    >
      {/* Role-First Onboarding Wizard Modal */}
      <RoleOnboardingWizard isOpen={showWizard} onClose={() => setShowWizard(false)} />

      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="p-3">
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center justify-between gap-2">
              <SidebarMenuButton
                asChild
                size="lg"
                className="h-11 px-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:hidden hover:bg-muted/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <Briefcase className="size-4 text-emerald-400" />
                  </div>
                  <span className="text-lg font-medium text-foreground">ApplyKit</span>
                </div>
              </SidebarMenuButton>
              <SidebarTrigger className="shrink-0" />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="gap-4 p-3">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="h-8 px-1 text-sm font-medium text-muted-foreground">
              Main
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          "h-9.5 gap-3 rounded-lg px-3 text-sm font-semibold transition-all duration-150 group/btn",
                          isActive
                            ? "bg-emerald-500/15 text-white"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <Link to={item.path} className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <Icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-emerald-400" : "text-zinc-400 group-hover/btn:text-emerald-400")} />
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </div>
                          {item.path === "/queue" && pendingCount > 0 && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs px-2 py-0 group-data-[collapsible=icon]:hidden",
                                isActive && "bg-emerald-500 text-white"
                              )}
                            >
                              {pendingCount}
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

        <SidebarSeparator />

        <SidebarFooter className="gap-2 p-3">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === "/settings"}
                tooltip="Settings"
                className={cn(
                  "h-9.5 gap-3 rounded-lg px-3 text-sm font-semibold transition-all duration-150 group/btn",
                  location.pathname === "/settings"
                    ? "bg-emerald-500/15 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Link to="/settings" className="flex items-center gap-3">
                  <Settings className={cn("size-4 shrink-0 transition-colors", location.pathname === "/settings" ? "text-emerald-400" : "text-zinc-400 group-hover/btn:text-emerald-400")} />
                  <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="pt-1 group-data-[collapsible=icon]:hidden space-y-1.5">
            <div className="relative group/prof">
              <div
                className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/60 transition-all duration-150 cursor-pointer"
                onClick={() => {
                  if (profiles.length > 1) {
                    const idx = profiles.findIndex((p) => p.id === activeProfile?.id);
                    const next = profiles[(idx + 1) % profiles.length];
                    if (next) {
                      conveyor.data.setActiveProfile(next.id).then(() => {
                        conveyor.data.getProfiles().then(setProfiles);
                        setActiveProfile(next);
                      });
                    }
                  }
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold text-xs flex items-center justify-center shrink-0">
                    {activeProfile?.name ? activeProfile.name.charAt(0).toUpperCase() : "P"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider leading-none">
                      Active Profile ({profiles.length})
                    </span>
                    <span className="text-xs font-medium text-foreground truncate mt-0.5">
                      {activeProfile?.name ?? "Select Role Profile"}
                    </span>
                  </div>
                </div>
                <Link to="/profiles" title="Manage Profiles" onClick={(e) => e.stopPropagation()} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                  <ChevronDown className="size-3.5 shrink-0" />
                </Link>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col min-w-0 h-screen">
        {/* Top bar control bar merged with top header */}
        <div className="h-12 border-b border-border/60 bg-background/95 backdrop-blur-md pl-6 pr-32 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {allNavItems.find((item) => item.path === location.pathname)?.label ?? "Dashboard"}
            </span>
          </div>

          {/* Global Run / Pause Engine Status */}
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
              <span>{isRunning ? "Engine Running" : "Engine Idle"}</span>
            </div>

            {isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={pauseQueue}
                className="gap-2 h-7 text-xs px-3 shadow-xs"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={startQueue}
                className="gap-2 h-7 text-xs px-3 shadow-xs"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Run Queue ({pendingCount})
              </Button>
            )}
          </div>
        </div>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};
