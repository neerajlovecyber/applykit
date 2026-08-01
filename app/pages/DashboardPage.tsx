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
} from "lucide-react";
import { Link } from "react-router-dom";

export const DashboardPage: React.FC = () => {
  const { isRunning, pendingCount, completedCount, failedCount, startQueue, pauseQueue } = useQueueStore();
  const { activeProfile } = useProfileStore();

  const totalProcessed = completedCount + failedCount;
  const successRate = totalProcessed > 0 ? Math.round((completedCount / totalProcessed) * 100) : 100;

  const recentActivity = [
    { title: "Frontend Engineer", company: "Stripe", platform: "LinkedIn", status: "done", time: "10m ago" },
    { title: "Senior React Developer", company: "Vercel", platform: "Lever", status: "done", time: "42m ago" },
    { title: "Full Stack Engineer", company: "Linear", platform: "Greenhouse", status: "failed", time: "1h ago" },
    { title: "UI Architect", company: "Figma", platform: "LinkedIn", status: "queued", time: "In Queue" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Hero Control Banner */}
      <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                ENGINE ACTIVE
              </Badge>
              <span className="text-xs text-muted-foreground">• Profile: {activeProfile?.name ?? "Default"}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Job Application Automation</h1>
            <p className="text-xs text-muted-foreground">
              Automatically applies to matched jobs on LinkedIn, Greenhouse, and Lever.
            </p>
          </div>

          <div>
            {isRunning ? (
              <Button size="lg" variant="destructive" onClick={pauseQueue} className="gap-2.5 px-6 shadow-sm">
                <Pause className="h-4 w-4" />
                Pause Execution
              </Button>
            ) : (
              <Button size="lg" onClick={startQueue} className="gap-2.5 px-6 shadow-sm">
                <Play className="h-4 w-4 fill-current" />
                Start Queue ({pendingCount})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Queue</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{pendingCount}</span>
            <span className="text-xs text-muted-foreground">jobs</span>
          </div>
        </Card>

        <Card className="p-5 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Applications Sent</span>
            <Send className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-400">{completedCount}</span>
            <span className="text-xs text-muted-foreground">submitted</span>
          </div>
        </Card>

        <Card className="p-5 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Needs Attention</span>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-rose-400">{failedCount}</span>
            <span className="text-xs text-muted-foreground">manual / failed</span>
          </div>
        </Card>

        <Card className="p-5 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success Rate</span>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{successRate}%</span>
            <span className="text-xs text-muted-foreground">completion</span>
          </div>
        </Card>
      </div>

      {/* Clean Activity Feed */}
      <Card className="p-6 border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold tracking-tight text-base">Recent Submissions</h3>
            <p className="text-xs text-muted-foreground">Latest job application logs and statuses</p>
          </div>
          <Link to="/queue" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            View full queue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border/60">
          {recentActivity.map((item, index) => (
            <div key={index} className="py-3 flex items-center justify-between gap-4 text-sm first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                {item.status === "failed" && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                {item.status === "queued" && <Clock className="h-4 w-4 text-amber-400 shrink-0" />}
                <div>
                  <div className="font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.company} • <span className="capitalize">{item.platform}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
