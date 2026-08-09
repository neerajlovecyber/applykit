import React, { useEffect, useState } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
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
  Target,
  Send,
  AlertCircle,
  Sparkles,
  Search,
  FileCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Application, JobPosting } from "@/lib/main/db-queries";

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
  const { isRunning, startQueue, pauseQueue } = useQueueStore();
  const { activeProfile, setActiveProfile } = useProfileStore();

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
      // Load active profile
      const active = await conveyor.data.getActiveProfile();
      if (active) setActiveProfile(active);

      // Load app stats
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

      // Load recent applications
      const apps = await conveyor.data.getApplications({ limit: 5 });
      const items: RecentItem[] = [];

      for (const app of apps) {
        const job = await conveyor.data.getJobPostingById(app.job_id);
        items.push({
          id: app.id,
          title: job?.title || "Position",
          company: job?.company || "Company",
          source: job?.source || "manual",
          status: app.status,
          time: new Date(app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      setRecentItems(items);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  };

  const totalProcessed = stats.submitted + stats.failed;
  const successRate = totalProcessed > 0 ? Math.round((stats.submitted / totalProcessed) * 100) : 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Jobs Processed</span>
            <Search className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{stats.totalDiscovered}</span>
            <span className="text-xs text-muted-foreground">scanned & indexed</span>
          </div>
        </Card>

        <Card className="p-5 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-amber-400">{stats.pending}</span>
            <span className="text-xs text-muted-foreground">awaiting review</span>
          </div>
        </Card>

        <Card className="p-5 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Applications Sent</span>
            <Send className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-400">{stats.submitted}</span>
            <span className="text-xs text-muted-foreground">successfully submitted</span>
          </div>
        </Card>

        <Card className="p-5 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success Rate</span>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{successRate}%</span>
            <span className="text-xs text-muted-foreground">submission rate</span>
          </div>
        </Card>
      </div>

      {/* Clean Activity Feed */}
      <Card className="p-6 border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold tracking-tight text-base">Recent Applications</h3>
            <p className="text-xs text-muted-foreground">Latest job application queue items and human review states</p>
          </div>
          <Link to="/queue" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            View full queue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border/60">
          {recentItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No recent applications yet. Go to <Link to="/auto-apply" className="text-primary hover:underline">Auto-Apply Bot</Link> to start applying!
            </div>
          ) : (
            recentItems.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-sm first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {item.status === "submitted" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                  {item.status === "approved" && <FileCheck className="h-4 w-4 text-primary shrink-0" />}
                  {item.status === "failed" && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                  {item.status === "pending_review" && <Clock className="h-4 w-4 text-amber-400 shrink-0" />}
                  <div>
                    <div className="font-medium text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.company} • <span className="uppercase font-mono text-[10px]">{item.source}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
