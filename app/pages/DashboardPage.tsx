import React from "react";
import { useQueueStore } from "@/app/stores/queue-store";
import { useProfileStore } from "@/app/stores/profile-store";
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
  Zap,
  TrendingUp,
  Target,
  Send,
  AlertCircle,
  Briefcase,
  Layers,
  Globe,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PortfolioChart } from "../../components/watermelon/web3-dashboard/components/web3/charts";

export const DashboardPage: React.FC = () => {
  const { isRunning, pendingCount, completedCount, failedCount, startQueue, pauseQueue } = useQueueStore();
  const { activeProfile } = useProfileStore();

  const totalProcessed = completedCount + failedCount;
  const successRate = totalProcessed > 0 ? Math.round((completedCount / totalProcessed) * 100) : 100;

  const platformBreakdown = [
    { name: "LinkedIn", count: "42 jobs", rate: "94%", color: "bg-blue-500" },
    { name: "Greenhouse", count: "28 jobs", rate: "89%", color: "bg-emerald-500" },
    { name: "Lever", count: "19 jobs", rate: "92%", color: "bg-orange-500" },
    { name: "Workday", count: "12 jobs", rate: "75%", color: "bg-purple-500" },
  ];

  const recentActivity = [
    { title: "Frontend Engineer", company: "Stripe", platform: "LinkedIn", status: "done", time: "10m ago" },
    { title: "Senior React Developer", company: "Vercel", platform: "Lever", status: "done", time: "42m ago" },
    { title: "Full Stack Engineer", company: "Linear", platform: "Greenhouse", status: "failed", time: "1h ago" },
    { title: "UI Architect", company: "Figma", platform: "LinkedIn", status: "queued", time: "In Queue" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Queue</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{pendingCount}</span>
            <span className="text-xs text-muted-foreground">jobs</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <Zap className="h-3.5 w-3.5" />
            <span>Ready to apply</span>
          </div>
        </Card>

        <Card className="p-5 border-border bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Applications Sent</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-400">{completedCount}</span>
            <span className="text-xs text-muted-foreground">submitted</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+12.4% this week</span>
          </div>
        </Card>

        <Card className="p-5 border-border bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Needs Attention</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-rose-400">{failedCount}</span>
            <span className="text-xs text-muted-foreground">failed / skipped</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 font-medium">
            <span>Requires manual input</span>
          </div>
        </Card>

        <Card className="p-5 border-border bg-card/60 backdrop-blur-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Success Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{successRate}%</span>
            <span className="text-xs text-muted-foreground">efficiency</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Optimal profile match</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Application Velocity Chart & Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Automation Controller + Application Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-card to-card relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold text-emerald-400 border-emerald-500/30">
                    AUTOMATION ENGINE
                  </Badge>
                  <span className="text-xs text-muted-foreground">Active Profile: {activeProfile?.name ?? "Default"}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Job Application Bot</h2>
                <p className="text-xs text-muted-foreground max-w-lg">
                  Submits applications across LinkedIn, Lever, Greenhouse, and Workday using AI resume data.
                </p>
              </div>

              <div>
                {isRunning ? (
                  <Button size="lg" variant="destructive" onClick={pauseQueue} className="gap-2.5 shadow-sm px-6">
                    <Pause className="h-4 w-4" />
                    Pause Automation
                  </Button>
                ) : (
                  <Button size="lg" onClick={startQueue} className="gap-2.5 shadow-sm px-6 bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Play className="h-4 w-4 fill-current" />
                    Start Queue ({pendingCount})
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Application Growth Velocity Chart */}
          <Card className="p-6 border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold tracking-tight text-base">Application Growth Velocity</h3>
                <p className="text-xs text-muted-foreground">Volume of job submissions over time</p>
              </div>
              <Badge variant="secondary" className="text-xs">This Month</Badge>
            </div>
            <div className="h-64 w-full pt-4">
              <PortfolioChart />
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Platform Breakdown & Recent Activity */}
        <div className="space-y-6">
          {/* Platforms Panel */}
          <Card className="p-5 border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold tracking-tight text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-400" />
                Supported Platforms
              </h3>
              <span className="text-xs text-muted-foreground">4 Active</span>
            </div>

            <div className="space-y-2.5">
              {platformBreakdown.map((platform) => (
                <div key={platform.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${platform.color}`} />
                    <span className="font-medium">{platform.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{platform.count}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                      {platform.rate}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Submissions Feed */}
          <Card className="p-5 border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold tracking-tight text-sm">Recent Submissions</h3>
                <p className="text-xs text-muted-foreground">Live application activity</p>
              </div>
              <Link to="/queue" className="text-xs text-emerald-400 font-medium flex items-center gap-1 hover:underline">
                View Queue <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-border/60">
              {recentActivity.map((item, index) => (
                <div key={index} className="py-3 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                    {item.status === "failed" && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                    {item.status === "queued" && <Clock className="h-4 w-4 text-amber-400 shrink-0" />}
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.company} • <span className="capitalize">{item.platform}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
