import React, { useEffect, useState } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useQueueStore } from "@/app/stores/queue-store";
import { useProfileStore } from "@/app/stores/profile-store";
import { useExecutionStore } from "@/app/stores/execution-store";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Target,
  Send,
  Sparkles,
  Search,
  FileCheck,
  Rocket,
  BrainCircuit,
  ListTodo,
  Settings,
  Linkedin,
  Zap,
  Building2,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  SkipForward,
} from "lucide-react";
import { Link } from "react-router-dom";

interface RecentItem {
  id: string;
  title: string;
  company: string;
  source: string;
  status: string;
  time: string;
}

export const DashboardPage: React.FC = () => {
  const conveyor = useConveyor();
  const { isRunning, startQueue, pauseQueue, pendingCount } = useQueueStore();
  const { activeProfile, setActiveProfile } = useProfileStore();
  const execution = useExecutionStore();

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    submitted: 0,
    failed: 0,
    totalDiscovered: 0,
    scored: 0,
  });

  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const active = await conveyor.data.getActiveProfile();
      if (active) setActiveProfile(active);

      const appStats = await conveyor.data.getApplicationStats();
      const jobStats = await conveyor.data.getJobPostingStats();

      setStats({
        pending: appStats.pending,
        approved: appStats.approved,
        submitted: appStats.submitted,
        failed: appStats.failed,
        totalDiscovered: jobStats.total,
        scored: jobStats.scored,
      });

      const apps = await conveyor.data.getApplicationsWithJobs();
      const items: RecentItem[] = (apps || []).slice(0, 6).map((app: any) => ({
        id: app.id,
        title: app.title || "Position",
        company: app.company || "Company",
        source: app.platform || "linkedin",
        status: app.status,
        time: new Date(app.created_at || Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      setRecentItems(items);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  };

  const totalProcessed = stats.submitted + stats.failed;
  const successRate = totalProcessed > 0 ? Math.round((stats.submitted / totalProcessed) * 100) : 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 select-none">
      {/* ── 1. Hero Welcome Card ─────────────────────────────────────────── */}
      <Card className="relative overflow-hidden p-6 border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-background to-cyan-950/20 shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Rocket className="h-48 w-48 text-emerald-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> ApplyKit AI Workspace
              </span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]">
                {activeProfile?.name ? activeProfile.name : "Default Profile"}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back, {activeProfile?.name ? activeProfile.name.split(" ")[0] : "Candidate"} 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Automate your job search on LinkedIn & Naukri with high-converting AI form completion and real-time execution tracking.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 shadow-sm text-xs h-9 px-4 whitespace-nowrap">
              <Link to="/auto-apply" className="inline-flex items-center justify-center flex-row gap-2 whitespace-nowrap">
                <Rocket className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Start Auto-Apply</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 text-xs h-9 px-4 whitespace-nowrap">
              <Link to="/queue" className="inline-flex items-center justify-center flex-row gap-2 whitespace-nowrap">
                <ListTodo className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Job Queue</span>
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* ── 2. Primary KPI Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Discovered Card */}
        <Card className="p-5 border-border/80 bg-card hover:border-emerald-500/30 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jobs Discovered</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Search className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">{stats.totalDiscovered}</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> Indexed
            </span>
          </div>
        </Card>

        {/* Pending Review Card */}
        <Card className="p-5 border-border/80 bg-card hover:border-amber-500/30 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-amber-400">{stats.pending}</span>
            <span className="text-xs text-muted-foreground">in queue</span>
          </div>
        </Card>

        {/* Applications Sent Card */}
        <Card className="p-5 border-border/80 bg-card hover:border-cyan-500/30 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applications Sent</span>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-cyan-400">{stats.submitted}</span>
            <span className="text-xs text-emerald-400 font-medium">submitted</span>
          </div>
        </Card>

        {/* Success Rate Card */}
        <Card className="p-5 border-border/80 bg-card hover:border-purple-500/30 transition-all duration-200 shadow-xs group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Success Rate</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-purple-400">{successRate}%</span>
            <span className="text-xs text-muted-foreground">submission rate</span>
          </div>
        </Card>
      </div>

      {/* ── 3. Main Split View: Activity Feed & Quick Actions ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Activity Feed (2 Cols) ───────────────────────────────── */}
        <Card className="lg:col-span-2 p-5 border-border/80 bg-card shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-1 border-b border-border/60">
            <div>
              <h3 className="font-bold tracking-tight text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" /> Recent Application Activity
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live auto-applied and submitted job entries across LinkedIn & Naukri
              </p>
            </div>

            <Link
              to="/history"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 hover:underline transition-colors"
            >
              View full history <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/40">
            {recentItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <p>No application history recorded yet.</p>
                <Button asChild variant="outline" size="sm" className="text-xs h-8">
                  <Link to="/auto-apply">Launch Auto-Apply Hub</Link>
                </Button>
              </div>
            ) : (
              recentItems.map((item) => {
                const companyInitial = item.company ? item.company.charAt(0).toUpperCase() : "C";
                const isLinkedIn = item.source === "linkedin";

                return (
                  <div
                    key={item.id}
                    className="py-2.5 px-2 flex items-center justify-between gap-4 text-xs hover:bg-muted/30 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar initial */}
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                        {companyInitial}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold text-foreground truncate text-sm">{item.title}</div>
                        <div className="text-muted-foreground flex items-center gap-2 text-[11px] truncate">
                          <span className="flex items-center gap-1 text-foreground/80 font-medium">
                            <Building2 className="h-3 w-3 text-muted-foreground" /> {item.company}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 uppercase font-mono text-[10px]">
                            {isLinkedIn ? (
                              <Linkedin className="h-3 w-3 text-blue-400 shrink-0" />
                            ) : (
                              <Zap className="h-3 w-3 text-emerald-400 fill-current shrink-0" />
                            )}
                            {item.source}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="outline"
                        className={`capitalize text-[10px] gap-1 px-2.5 py-0.5 ${
                          item.status === "submitted" || item.status === "applied"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : item.status === "skipped"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : item.status === "pending_review" || item.status === "pending"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {(item.status === "submitted" || item.status === "applied") && <CheckCircle2 className="h-3 w-3" />}
                        {item.status === "skipped" && <SkipForward className="h-3 w-3" />}
                        {(item.status === "pending_review" || item.status === "pending") && <Clock className="h-3 w-3" />}
                        {item.status === "failed" && <XCircle className="h-3 w-3" />}
                        {item.status}
                      </Badge>
                      <span className="text-muted-foreground font-mono text-[11px] min-w-[55px] text-right">{item.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* ── Right: Quick Action Shortcuts & Status (1 Col) ───────────────── */}
        <div className="space-y-4">
          {/* Engine Card */}
          <Card className="p-5 border-border/80 bg-card space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-400" /> Automation Engine
              </h4>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isRunning || execution.isRunning ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                }`}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-foreground">
                {execution.isRunning
                  ? `Running Auto-Apply (${execution.platform.toUpperCase()})`
                  : isRunning
                  ? "Worker Engine Active"
                  : "Engine Idle"}
              </div>
              <p className="text-xs text-muted-foreground">
                {execution.isRunning
                  ? "Playwright browser pool navigating job postings in background..."
                  : "Ready for automated application dispatch."}
              </p>
            </div>

            <div className="pt-1">
              {isRunning || execution.isRunning ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (isRunning) pauseQueue();
                    if (execution.isRunning) execution.finishExecution(false, "Stopped by user");
                  }}
                  className="w-full text-xs font-semibold h-8 gap-1.5"
                >
                  <Pause className="h-3.5 w-3.5 fill-current" /> Stop Execution
                </Button>
              ) : (
                <Button
                  asChild
                  size="sm"
                  className="w-full text-xs font-semibold h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white whitespace-nowrap"
                >
                  <Link to="/auto-apply" className="inline-flex items-center justify-center flex-row gap-1.5 w-full whitespace-nowrap">
                    <Play className="h-3.5 w-3.5 fill-current shrink-0" />
                    <span className="whitespace-nowrap">Launch Auto-Apply</span>
                  </Link>
                </Button>
              )}
            </div>
          </Card>

          {/* Quick Hub Shortcuts */}
          <Card className="p-5 border-border/80 bg-card space-y-3 shadow-sm">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Quick Navigation</h4>

            <div className="space-y-2">
              <Link
                to="/auto-apply"
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Rocket className="h-3.5 w-3.5" />
                  </div>
                  <span>Auto-Apply Hub</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/queue"
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <ListTodo className="h-3.5 w-3.5" />
                  </div>
                  <span>Job Queue & Review</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/qabank"
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
                  <div className="h-7 w-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                    <BrainCircuit className="h-3.5 w-3.5" />
                  </div>
                  <span>QA Memory Bank</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/settings"
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                    <Settings className="h-3.5 w-3.5" />
                  </div>
                  <span>AI Model Settings</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
