import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQueueStore } from "@/app/stores/queue-store";
import { useProfileStore } from "@/app/stores/profile-store";
import { useExecutionStore } from "@/app/stores/execution-store";
import { useConveyor } from "@/app/hooks/use-conveyor";
import applykitLogo from "@/app/assets/applykit-light.png";
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
  Sparkles,
  Rocket,
  Loader2,
  ChevronsUpDown,
  Check,
  Plus,
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
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { RunActionButton } from "@/app/components/ui/run-action-button";
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

const getInitial = (name?: string) => {
  if (!name) return "P";
  const cleanName = name.replace(/^[\p{Emoji}\s]+/u, "").trim();
  return [...(cleanName || name)][0]?.toUpperCase() || "P";
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const conveyor = useConveyor();
  const { isRunning, pendingCount, startQueue, pauseQueue } = useQueueStore();
  const { activeProfile, profiles, setProfiles, setActiveProfile } = useProfileStore();
  const execution = useExecutionStore();

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
              {/* Expanded: logo + text */}
              <SidebarMenuButton
                asChild
                size="lg"
                className="h-11 px-2 group-data-[collapsible=icon]:hidden hover:bg-muted/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={applykitLogo}
                    alt="ApplyKit"
                    className="size-10 rounded-xl shrink-0 object-contain"
                  />
                  <span className="text-lg font-medium text-foreground">ApplyKit</span>
                </div>
              </SidebarMenuButton>
              {/* Collapsed: logo icon only */}
              <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full">
                <img
                  src={applykitLogo}
                  alt="ApplyKit"
                    className="size-10 rounded-xl object-contain"
                />
              </div>
              <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:hidden" />
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

          <div className="pt-1 group-data-[collapsible=icon]:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/60 transition-all duration-150 cursor-pointer outline-none">
                <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center shrink-0">
                  {getInitial(activeProfile?.name)}
                </div>
                <div className="flex flex-col min-w-0 text-left flex-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider leading-none">Active Profile</span>
                  <span className="text-xs font-medium text-foreground truncate mt-0.5">{activeProfile?.name ?? "Select Profile"}</span>
                </div>
                <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--anchor-width)"
                side="top"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Profiles</DropdownMenuLabel>
                  {profiles.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      className="flex items-center gap-2.5 cursor-pointer"
                      onClick={() => {
                        conveyor.data.setActiveProfile(p.id).then(() => {
                          conveyor.data.getProfiles().then(setProfiles);
                          setActiveProfile(p);
                        });
                      }}
                    >
                      <div className="size-6 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {getInitial(p.name)}
                      </div>
                      <span className="text-xs flex-1 truncate">{p.name}</span>
                      {activeProfile?.id === p.id && <Check className="size-3.5 text-emerald-400 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/profiles" className="flex items-center gap-2 text-xs">
                    <Plus className="size-3.5" /> Add Profile
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

          {/* Global Run / Stop Dynamic Engine Control */}
          <div className="flex items-center gap-3">
            <RunActionButton
              isRunning={isRunning || execution.isRunning}
              onRun={startQueue}
              onStop={() => {
                if (isRunning) pauseQueue();
                if (execution.isRunning) execution.finishExecution(false, "Execution stopped by user");
              }}
              runLabel={`Run Queue (${pendingCount})`}
              runningLabel={execution.isRunning ? `Applying (${execution.platform.toUpperCase()})` : "Engine Running"}
            />
          </div>
        </div>

        {/* Page Body */}
        <ScrollArea className="flex-1 h-0">
          <main className="p-6">{children}</main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
};
