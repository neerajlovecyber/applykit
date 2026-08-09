import React, { useState, useEffect } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useQueueStore } from "@/app/stores/queue-store";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import {
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  FileText,
  Send,
  Loader2,
} from "lucide-react";
import type { Application, JobPosting } from "@/lib/main/db-queries";

interface ApplicationItem extends Application {
  job?: JobPosting;
}

export const JobQueuePage: React.FC = () => {
  const conveyor = useConveyor();
  const { isRunning, startQueue, pauseQueue } = useQueueStore();
  const { activeProfile } = useProfileStore();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const apps = await conveyor.data.getApplications();
      const enriched: ApplicationItem[] = [];

      // Job Queue is ONLY for external/manual jobs needing review — filter out completed auto-applies
      const pendingQueueItems = (apps || []).filter((app) =>
        ["pending_review", "queued", "approved", "draft"].includes(app.status)
      );

      for (const app of pendingQueueItems) {
        const job = await conveyor.data.getJobPostingById(app.job_id);
        enriched.push({ ...app, job });
      }

      setApplications(enriched);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !activeProfile) return;

    let source = "manual";
    if (urlInput.includes("linkedin")) source = "linkedin";
    else if (urlInput.includes("naukri")) source = "naukri";
    else if (urlInput.includes("indeed")) source = "indeed";
    else if (urlInput.includes("lever")) source = "lever";
    else if (urlInput.includes("greenhouse")) source = "greenhouse";

    // 1. Create or upsert job posting
    const job = await conveyor.data.upsertJobPosting({
      source,
      source_id: `url-${Date.now()}`,
      title: "Discovered Job Position",
      company: "Target Company",
      application_url: urlInput,
    });

    // 2. Create application row
    await conveyor.data.createApplication({
      job_id: job.id,
      profile_id: activeProfile.id,
      status: "pending_review",
    });

    setUrlInput("");
    loadApplications();
  };

  const handleGenerateMaterials = async (app: ApplicationItem) => {
    if (!activeProfile || !app.job) return;
    setGeneratingId(app.id);

    try {
      const profileSummary = `Candidate: ${activeProfile.name}. Skills: ${activeProfile.skills}. Experience: ${activeProfile.experience_years} years. ${activeProfile.summary || ""}`;
      const jobDesc = `${app.job.title} at ${app.job.company}. ${app.job.description || ""}`;

      // Generate cover letter using Vercel AI SDK IPC
      const coverLetter = await (window as any).electron?.ipcRenderer?.invoke(
        "llm:generate-cover-letter",
        { profileSummary, jobDescription: jobDesc }
      );

      await conveyor.data.updateApplicationMaterials(app.id, {
        cover_letter: coverLetter,
        resume_version: `tailored_${activeProfile.name.toLowerCase().replace(/\s+/g, "_")}.pdf`,
      });

      loadApplications();
    } catch (err) {
      console.error("Materials generation failed:", err);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    await conveyor.data.updateApplicationStatus(id, "approved", "User approved in review queue");
    loadApplications();
  };

  const handleSkip = async (id: string) => {
    await conveyor.data.updateApplicationStatus(id, "skipped", "User skipped");
    loadApplications();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl">
        <form onSubmit={handleAddUrl} className="flex gap-2 w-full md:w-auto flex-1 max-w-lg">
          <Input
            placeholder="Paste job URL (LinkedIn, Naukri, Lever, Greenhouse)..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="gap-2 text-xs">
            <Plus className="h-4 w-4" /> Add to Queue
          </Button>
        </form>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button size="sm" variant="destructive" onClick={pauseQueue} className="gap-1.5 text-xs">
              Pause Queue
            </Button>
          ) : (
            <Button size="sm" onClick={startQueue} className="gap-1.5 text-xs">
              <Send className="h-3.5 w-3.5" /> Run Application Worker ({applications.filter((a) => a.status === "approved").length} Approved)
            </Button>
          )}
        </div>
      </div>

      {/* Applications Review Queue Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-medium">
            <tr>
              <th className="p-4">Job & Company</th>
              <th className="p-4">Source</th>
              <th className="p-4">Status / Review Gate</th>
              <th className="p-4 text-right">Human Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No applications in queue. Run Auto-Apply Bot or paste a URL above.
                </td>
              </tr>
            ) : (
              applications.map((app) => {
                const isGenerating = generatingId === app.id;
                const isApproved = app.status === "approved";
                const isSubmitted = app.status === "submitted";
                const isSkipped = app.status === "skipped";

                return (
                  <tr key={app.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">
                      <div className="text-foreground">{app.job?.title || "Target Position"}</div>
                      <div className="text-xs text-muted-foreground">{app.job?.company || "Target Company"}</div>
                    </td>

                    <td className="p-4 text-xs font-mono uppercase text-muted-foreground">
                      {app.job?.source || "manual"}
                    </td>

                    <td className="p-4">
                      {app.status === "pending_review" && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending Review (HITL)
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                          Approved for Submit
                        </Badge>
                      )}
                      {isSubmitted && (
                        <Badge variant="default" className="text-xs bg-emerald-500">
                          Submitted
                        </Badge>
                      )}
                      {isSkipped && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Skipped
                        </Badge>
                      )}
                    </td>

                    <td className="p-4 text-right space-x-2">
                      {!isApproved && !isSubmitted && !isSkipped && (
                        <Button size="sm" onClick={() => handleApprove(app.id)} className="h-8 gap-1 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                      )}

                      {!isSubmitted && !isSkipped && (
                        <Button size="sm" variant="outline" onClick={() => handleSkip(app.id)} className="h-8 gap-1 text-xs text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5" /> Skip
                        </Button>
                      )}

                      {app.job?.application_url && (
                        <a
                          href={app.job.application_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
