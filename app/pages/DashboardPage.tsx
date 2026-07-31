import React from "react";
import { useQueueStore } from "@/app/stores/queue-store";
import { useProfileStore } from "@/app/stores/profile-store";
import { Card } from "@/app/components/ui/button";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Play, Pause, CheckCircle2, XCircle, Clock, ArrowRight, Zap, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

export const DashboardPage: React.FC = () => {
  const { isRunning, pendingCount, completedCount, failedCount, startQueue, pauseQueue } = useQueueStore();
  const { activeProfile } = useProfileStore();

  const recentActivity = [
    { title: "Frontend Engineer", company: "Stripe", platform: "LinkedIn", status: "done", time: "10m ago" },
    { title: "Senior React Developer", company: "Vercel", platform: "Lever", status: "done", time: "42m ago" },
    { title: "Full Stack Engineer", company: "Linear", platform: "Greenhouse", status: "failed", time: "1h ago" },
    { title: "UI Architect", company: "Figma", platform: "LinkedIn", status: "queued", time: "In Queue" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Big Status Hero Card */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
                Automation Queue
              </Badge>
              <span className="text-xs text-muted-foreground">• Active: {activeProfile?.name ?? "Default"}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {pendingCount} {pendingCount === 1 ? "Job Pending" : "Jobs Pending in Queue"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md">
              ApplyKit automatically processes Easy Apply forms using your active Role Profile preferences.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {isRunning ? (
              <Button size="lg" variant="destructive" onClick={pauseQueue} className="gap-3 px-8 shadow-sm">
                <Pause className="h-5 w-5" />
                Pause Execution
              </Button>
            ) : (
              <Button size="lg" onClick={startQueue} className="gap-3 px-8 shadow-sm">
                <Play className="h-5 w-5 fill-current" />
                Start Applying Now
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Jobs</div>
          <div className="text-2xl font-bold">{pendingCount}</div>
          <div className="text-xs text-muted-foreground">Ready for next run</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Applications Sent</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          <div className="text-xs text-muted-foreground">Successfully submitted</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed / Skipped</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{failedCount}</div>
          <div className="text-xs text-muted-foreground">Requires attention</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success Rate</div>
          <div className="text-2xl font-bold">
            {completedCount + failedCount > 0
              ? `${Math.round((completedCount / (completedCount + failedCount)) * 100)}%`
              : "100%"}
          </div>
          <div className="text-xs text-muted-foreground">Overall completion efficiency</div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold tracking-tight text-base">Recent Activity</h3>
            <p className="text-xs text-muted-foreground">Latest job applications processed</p>
          </div>
          <Link to="/queue" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            View full queue <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-border/60">
          {recentActivity.map((item, index) => (
            <div key={index} className="py-3.5 flex items-center justify-between gap-4 text-sm first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                {item.status === "failed" && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                {item.status === "queued" && <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                <div>
                  <div className="font-medium leading-none">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.company} • <span className="capitalize">{item.platform}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{item.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
