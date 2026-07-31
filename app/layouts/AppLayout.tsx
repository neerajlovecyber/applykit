import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useQueueStore } from "@/app/stores/queue-store";
import { useProfileStore } from "@/app/stores/profile-store";
import {
  LayoutDashboard,
  ListTodo,
  Compass,
  UserCheck,
  History,
  Settings,
  Play,
  Pause,
  Briefcase,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/queue", label: "Job Queue", icon: ListTodo },
  { path: "/finder", label: "Job Finder", icon: Compass },
  { path: "/profiles", label: "Role Profiles", icon: UserCheck },
  { path: "/history", label: "History", icon: History },
  { path: "/settings", label: "Settings", icon: Settings },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isRunning, pendingCount, startQueue, pauseQueue } = useQueueStore();
  const { activeProfile } = useProfileStore();

  return (
    <div className="flex h-screen bg-background text-foreground select-none overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col justify-between p-4">
        <div>
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 px-2 py-4 mb-4 border-b border-border/50">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-base">ApplyKit</h1>
              <p className="text-xs text-muted-foreground">Auto-Job Applicator</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.path === "/queue" && pendingCount > 0 && (
                    <Badge variant={isActive ? "secondary" : "outline"} className="text-xs px-2">
                      {pendingCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Active Profile Status */}
        <div className="p-3 bg-muted/40 rounded-xl border border-border/40 text-xs">
          <div className="text-muted-foreground mb-1">Active Profile</div>
          <div className="font-medium truncate">{activeProfile?.name ?? "No profile selected"}</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header with Global Controls */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xs px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {navItems.find((item) => item.path === location.pathname)?.label ?? "Dashboard"}
            </h2>
          </div>

          {/* Global Run / Pause Button */}
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
                className="gap-2 shadow-xs"
              >
                <Pause className="h-4 w-4" />
                Pause Automation
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={startQueue}
                className="gap-2 shadow-xs"
              >
                <Play className="h-4 w-4" />
                Run Queue ({pendingCount})
              </Button>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};
