import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useLocation } from "react-router-dom";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Download, Search, CheckCircle2, XCircle, ExternalLink, SkipForward, Clock, Linkedin, Zap, Building2, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const HistoryPage: React.FC = () => {
  const conveyor = useConveyor();
  const location = useLocation();
  const { activeProfile } = useProfileStore();

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    loadHistory();
    // Poll every 3 seconds to auto-refresh live history entries while view is visible
    const timer = setInterval(() => {
      loadHistory(false);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeProfile, location.pathname]);

  const loadHistory = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const list = await conveyor.data.getApplicationsWithJobs(activeProfile?.id);
      setApplications(list || []);
    } catch (err) {
      console.error("Failed to load application history:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await conveyor.data.clearApplicationHistory(activeProfile?.id);
      setApplications([]);
      setShowConfirmClear(false);
    } catch (err) {
      console.error("Failed to clear application history:", err);
    }
  };

  const handleExportCSV = () => {
    if (!applications.length) return;

    const headers = ["Job Title", "Company", "Platform", "Location", "Status", "Applied Date", "URL"];
    const rows = applications.map((app) => [
      `"${(app.title || "").replace(/"/g, '""')}"`,
      `"${(app.company || "").replace(/"/g, '""')}"`,
      app.platform || "manual",
      `"${(app.location || "").replace(/"/g, '""')}"`,
      app.status,
      new Date(app.created_at || app.submitted_at || Date.now()).toISOString(),
      `"${app.application_url || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `applykit_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      !search ||
      (app.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (app.company || "").toLowerCase().includes(search.toLowerCase());

    const matchesPlatform = platformFilter === "all" || app.platform === platformFilter;
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;

    return matchesSearch && matchesPlatform && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header & Export / Clear Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Application History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full record of all job applications auto-applied or submitted across Naukri & LinkedIn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirmClear(true)}
            disabled={!applications.length}
            className="gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" /> Clear History
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!applications.length} className="gap-2 text-xs font-semibold">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmClear && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-rose-300 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>Are you sure you want to clear all saved application history? This action cannot be undone.</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setShowConfirmClear(false)} className="h-7 text-xs">
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleClearHistory} className="h-7 text-xs font-semibold">
              Yes, Clear History
            </Button>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job title or company..."
            className="pl-9 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span>Platform:</span>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger size="sm" className="text-xs h-7 min-w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="naukri">Naukri</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span>Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="text-xs h-7 min-w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden text-xs shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border text-[11px] text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3">Job Title & Company</th>
              <th className="p-3">Platform</th>
              <th className="p-3">Location</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date Applied</th>
              <th className="p-3 text-right">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filteredApplications.length > 0 ? (
              filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-medium">
                    <div className="text-foreground font-semibold truncate">{app.title}</div>
                    <div className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                      <Building2 className="h-2.5 w-2.5" /> {app.company}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="capitalize text-[10px] gap-1 font-medium">
                      {app.platform === "linkedin" ? <Linkedin className="h-3 w-3 text-blue-400" /> : <Zap className="h-3 w-3 text-emerald-400 fill-current" />}
                      {app.platform || "manual"}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground text-[11px] truncate">{app.location || "—"}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={cn(
                      "capitalize text-[10px] gap-1",
                      app.status === "submitted" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : app.status === "skipped" ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : app.status === "pending_review" ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    )}>
                      {app.status === "submitted" && <CheckCircle2 className="h-3 w-3" />}
                      {app.status === "skipped" && <SkipForward className="h-3 w-3" />}
                      {app.status === "pending_review" && <Clock className="h-3 w-3" />}
                      {app.status === "failed" && <XCircle className="h-3 w-3" />}
                      {app.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground text-[11px]">
                    {new Date(app.created_at || app.submitted_at || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    {app.application_url ? (
                      <a
                        href={app.application_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  {loading ? "Loading history..." : "No application records found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
