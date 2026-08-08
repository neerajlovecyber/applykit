import React, { useState, useEffect } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useJobStore } from "@/app/stores/job-store";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import {
  Search,
  MapPin,
  DollarSign,
  Plus,
  Check,
  Sparkles,
  RefreshCw,
  Zap,
  Bookmark,
  ExternalLink,
  Loader2,
  Globe,
} from "lucide-react";
import type { JobPosting } from "@/lib/main/db-queries";

export const JobFinderPage: React.FC = () => {
  const conveyor = useConveyor();
  const { jobPostings, setJobPostings, isLoading, setLoading } = useJobStore();
  const { activeProfile } = useProfileStore();

  const [keywords, setKeywords] = useState("Software Engineer");
  const [location, setLocation] = useState("Remote");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResultMsg, setScrapeResultMsg] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const posts = await conveyor.data.getJobPostings({
        source: selectedPlatform === "all" ? undefined : selectedPlatform,
        limit: 50,
      });

      if (posts.length === 0) {
        // Seed default sample postings into SQLite if table is empty
        const sampleData = [
          { source: "linkedin", source_id: "ln-101", title: "Senior Frontend Engineer", company: "Stripe", location: "Remote", employment_type: "Full-Time", seniority: "Senior", description: "Looking for an experienced React/TypeScript developer to lead frontend UI architecture.", salary_info: "$160,000 - $190,000", application_url: "https://linkedin.com/jobs/view/101", match_score: 0.92 },
          { source: "naukri", source_id: "nk-202", title: "Full Stack Engineer (Node + React)", company: "Razorpay", location: "Bangalore (Hybrid)", employment_type: "Full-Time", seniority: "Mid", description: "Build scalable fintech payment solutions using Node.js, React, PostgreSQL.", salary_info: "₹25,000,000 - ₹35,000,000", application_url: "https://naukri.com/job-listings-202", match_score: 0.88 },
          { source: "indeed", source_id: "ind-303", title: "React Developer", company: "Linear", location: "Remote", employment_type: "Full-Time", seniority: "Mid", description: "Build beautiful desktop-class web applications with React, Tailwind, Electron.", salary_info: "$140,000 - $170,000", application_url: "https://indeed.com/viewjob?jk=303", match_score: 0.95 },
          { source: "greenhouse", source_id: "gh-404", title: "Staff UI Engineer", company: "Figma", location: "San Francisco, CA", employment_type: "Full-Time", seniority: "Staff", description: "Design dynamic web graphics and canvas systems using WebGL & WebAssembly.", salary_info: "$210,000 - $250,000", application_url: "https://boards.greenhouse.io/figma/jobs/404", match_score: 0.82 },
        ];

        for (const sample of sampleData) {
          await conveyor.data.upsertJobPosting(sample);
        }
        const reloaded = await conveyor.data.getJobPostings();
        setJobPostings(reloaded);
      } else {
        setJobPostings(posts);
      }
    } catch (err) {
      console.error("Failed to load job postings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunLiveScraper = async () => {
    setIsScraping(true);
    setScrapeResultMsg("Launching Playwright scraper...");
    try {
      const options = {
        source: selectedPlatform,
        keywords,
        location,
        maxPages: 2,
        easyApplyOnly: true,
      };

      const result = await (window as any).electron?.ipcRenderer?.invoke("search:execute", { options });

      if (result?.error) {
        setScrapeResultMsg(`Scraper notice: ${result.error}`);
      } else {
        setScrapeResultMsg(
          `Scraped ${result?.totalScraped || 0} jobs (${result?.newJobsAdded || 0} new added, ${result?.duplicatesSkipped || 0} duplicates skipped).`
        );
        loadJobs();
      }
    } catch (err) {
      setScrapeResultMsg(err instanceof Error ? err.message : "Scraper execution failed");
    } finally {
      setIsScraping(false);
    }
  };

  const handleCreateSearchQuery = async () => {
    if (!activeProfile) return;
    await conveyor.data.createSearchQuery({
      profile_id: activeProfile.id,
      source: selectedPlatform === "all" ? "linkedin" : selectedPlatform,
      keywords,
      location,
      max_pages: 3,
      run_interval_hours: 24,
    });
    alert(`Saved search query for "${keywords}" (${location}).`);
  };

  const handleScoreJobWithAI = async (job: JobPosting) => {
    if (!activeProfile) {
      alert("Please select an active profile in Profiles page first.");
      return;
    }
    setScoringId(job.id);
    try {
      const profileSummary = `Candidate: ${activeProfile.name}. Skills: ${activeProfile.skills}. Experience: ${activeProfile.experience_years} years (${activeProfile.seniority}). Summary: ${activeProfile.summary || ""}`;
      const result = await (window as any).electron?.ipcRenderer?.invoke("llm:score-job", {
        profileSummary,
        jobDescription: `${job.title} at ${job.company}. ${job.description || ""}`,
      });

      if (result?.score !== undefined) {
        await conveyor.data.updateJobPostingScore(
          job.id,
          result.score,
          JSON.stringify(result.breakdown),
          result.explanation
        );
        loadJobs();
      }
    } catch (err) {
      console.error("AI scoring failed:", err);
    } finally {
      setScoringId(null);
    }
  };

  const handleQueueJob = async (job: JobPosting) => {
    if (!activeProfile) {
      alert("Please select or create an active profile first.");
      return;
    }
    await conveyor.data.createApplication({
      job_id: job.id,
      profile_id: activeProfile.id,
      status: "pending_review",
    });
    await conveyor.data.updateJobPostingState(job.id, "queued");
    loadJobs();
  };

  const filteredJobs = jobPostings;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Search Header */}
      <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Search job title, skills, or company..."
              className="pl-9"
            />
          </div>

          <div className="relative w-full md:w-56">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Remote)"
              className="pl-9"
            />
          </div>

          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
          >
            <option value="all">All Portals</option>
            <option value="linkedin">LinkedIn</option>
            <option value="naukri">Naukri</option>
            <option value="indeed">Indeed</option>
            <option value="lever">Lever</option>
            <option value="greenhouse">Greenhouse</option>
          </select>

          <Button
            onClick={handleRunLiveScraper}
            disabled={isScraping}
            className="gap-2 shrink-0 text-xs bg-primary text-primary-foreground"
          >
            {isScraping ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Scraping...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" /> Run Live Scraper
              </>
            )}
          </Button>

          <Button onClick={handleCreateSearchQuery} variant="outline" className="gap-2 shrink-0 text-xs">
            <Bookmark className="h-4 w-4" /> Save Search
          </Button>
        </div>

        {scrapeResultMsg && (
          <div className="p-3 rounded-lg bg-primary/10 text-primary text-xs flex items-center gap-2 border border-primary/20">
            <Zap className="h-4 w-4 shrink-0" />
            <span>{scrapeResultMsg}</span>
          </div>
        )}
      </div>

      {/* Discovered Jobs List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">
            Discovered Job Index ({filteredJobs.length})
          </h3>
          <Button size="sm" variant="ghost" onClick={loadJobs} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => {
            const isQueued = job.state === "queued" || job.state === "applied";
            const isScoringThis = scoringId === job.id;

            return (
              <div
                key={job.id}
                className="p-5 bg-card border border-border rounded-xl space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-base leading-snug">{job.title}</h4>
                      <div className="text-sm font-medium text-muted-foreground">{job.company}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-xs capitalize">
                        {job.source}
                      </Badge>
                      {job.match_score !== null && (
                        <Badge
                          variant="secondary"
                          className={`text-xs font-bold ${
                            job.match_score >= 0.85
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {Math.round(job.match_score * 100)}% Fit
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.location || "Remote"}
                    </span>
                    {job.salary_info && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" /> {job.salary_info}
                      </span>
                    )}
                  </div>

                  {job.description && (
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 pt-1">
                      {job.description}
                    </p>
                  )}

                  {job.match_explanation && (
                    <div className="p-2.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground border border-border/40 flex items-start gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{job.match_explanation}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                  {job.application_url ? (
                    <a
                      href={job.application_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      View Posting <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground capitalize">State: {job.state}</span>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleScoreJobWithAI(job)}
                      disabled={isScoringThis}
                      className="gap-1 text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      {isScoringThis ? "Scoring..." : "Score Fit"}
                    </Button>

                    {isQueued ? (
                      <Button size="sm" variant="outline" disabled className="gap-1 text-emerald-400 border-emerald-500/30 text-xs">
                        <Check className="h-3.5 w-3.5" /> Queued
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleQueueJob(job)} className="gap-1 text-xs">
                        <Plus className="h-3.5 w-3.5" /> Queue Apply
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
