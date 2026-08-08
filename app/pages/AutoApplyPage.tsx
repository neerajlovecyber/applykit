import React, { useState, useEffect, useRef } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  MapPin,
  Globe,
  Settings,
  Sparkles,
  Linkedin,
  ChevronDown,
  ChevronUp,
  Filter,
  Bot,
  Rocket,
  SkipForward,
  Clock,
  Briefcase,
  Building2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Platform = "linkedin" | "naukri";

interface RunResult {
  jobId?: string;
  title: string;
  company: string;
  location?: string;
  status: string;
  success: boolean;
  fieldsFilled?: number;
  errorMessage?: string;
}

interface RunStats {
  processed: number;
  applied?: number;
  skipped?: number;
  failed?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoApplyPage
// ─────────────────────────────────────────────────────────────────────────────

export const AutoApplyPage: React.FC = () => {
  const conveyor = useConveyor();
  const { activeProfile } = useProfileStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  const [activePlatform, setActivePlatform] = useState<Platform>("linkedin");

  // ── Shared fields ──────────────────────────────────────────────────────
  const [keywords, setKeywords] = useState("Software Engineer");
  const [location, setLocation] = useState("");
  const [maxJobs, setMaxJobs] = useState<number>(10);
  const [pauseBeforeSubmit, setPauseBeforeSubmit] = useState(false);

  // ── Auth fields ────────────────────────────────────────────────────────
  const [linkedinUsername, setLinkedinUsername] = useState("");
  const [linkedinPassword, setLinkedinPassword] = useState("");
  const [naukriUsername, setNaukriUsername] = useState("");
  const [naukriPassword, setNaukriPassword] = useState("");

  // ── LinkedIn advanced filters ──────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [easyApplyOnly, setEasyApplyOnly] = useState(true);
  const [under10Applicants, setUnder10Applicants] = useState(false);
  const [datePosted, setDatePosted] = useState<string>("anyTime");
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [selectedJobType, setSelectedJobType] = useState<string[]>([]);
  const [selectedWorkMode, setSelectedWorkMode] = useState<string[]>([]);

  // ── Run state ──────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [logResults, setLogResults] = useState<RunResult[]>([]);
  const [runStats, setRunStats] = useState<RunStats | null>(null);

  // ── Connection status ──────────────────────────────────────────────────
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [naukriConnected, setNaukriConnected] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadStoredCredentials();
    checkConnections();
    if (activeProfile?.target_titles) {
      try {
        const titles = JSON.parse(activeProfile.target_titles);
        if (Array.isArray(titles) && titles.length > 0) setKeywords(titles[0]);
      } catch { /* ignore */ }
    }
  }, [activeProfile]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logResults]);

  const loadStoredCredentials = async () => {
    try {
      const liRaw = await conveyor.data.getSetting("linkedin_credentials");
      if (liRaw) {
        const p = JSON.parse(liRaw);
        if (p.username) setLinkedinUsername(p.username);
        if (p.password) setLinkedinPassword(p.password);
      }
    } catch { /* ignore */ }
    try {
      const nkRaw = await conveyor.data.getSetting("naukri_credentials");
      if (nkRaw) {
        const p = JSON.parse(nkRaw);
        if (p.username) setNaukriUsername(p.username);
        if (p.password) setNaukriPassword(p.password);
      }
    } catch { /* ignore */ }
  };

  const checkConnections = async () => {
    try {
      const raw = await conveyor.data.getSetting("linkedin_credentials");
      setLinkedinConnected(!!raw && JSON.parse(raw || "{}").username);
    } catch { setLinkedinConnected(false); }
    try {
      const p = await conveyor.data.getPlatformById("naukri");
      setNaukriConnected(p?.status === "connected" || !!p?.auth_token);
    } catch { setNaukriConnected(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleRunLinkedIn = async () => {
    setIsRunning(true);
    setLogResults([]);
    setRunStats(null);
    setStatusType("info");
    setStatusMsg("🚀 Opening browser, logging into LinkedIn, applying filters and starting auto-apply...");

    try {
      const response = await conveyor.data.runLinkedInAutoApply({
        keywords,
        location: location || undefined,
        maxJobs,
        filters: {
          easyApplyOnly,
          under10Applicants,
          datePosted: datePosted as any,
          experienceLevel: selectedExperience.length ? selectedExperience : undefined,
          jobType: selectedJobType.length ? selectedJobType : undefined,
          workMode: selectedWorkMode.length ? selectedWorkMode : undefined,
        },
        pauseBeforeSubmit,
        username: linkedinUsername || undefined,
        password: linkedinPassword || undefined,
      });

      if (response?.error) {
        setStatusType("error");
        setStatusMsg(`⚠️ ${response.error}`);
      } else {
        setStatusType("success");
        setRunStats({
          processed: response.processed || 0,
          applied: response.applied || 0,
          skipped: response.skipped || 0,
          failed: response.failed || 0,
        });
        setStatusMsg(
          `✅ Completed! Applied: ${response.applied || 0} | Skipped: ${response.skipped || 0} | Failed: ${response.failed || 0}`
        );
        setLogResults(response.results || []);
        setLinkedinConnected(true);
      }
    } catch (err) {
      setStatusType("error");
      setStatusMsg(err instanceof Error ? err.message : "LinkedIn auto-apply run failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunNaukri = async () => {
    setIsRunning(true);
    setLogResults([]);
    setRunStats(null);
    setStatusType("info");
    setStatusMsg("🚀 Opening Playwright browser, performing Naukri login, searching jobs, and auto-applying...");

    try {
      if (naukriUsername && naukriPassword) {
        await conveyor.data.setSetting("naukri_credentials", JSON.stringify({ username: naukriUsername, password: naukriPassword }));
      }

      const response = await conveyor.data.runNaukriAutoApply({
        keywords,
        location: location || "Bangalore",
        maxJobs,
        pauseBeforeSubmit,
        username: naukriUsername,
        password: naukriPassword,
      });

      if (response?.error) {
        setStatusType("error");
        setStatusMsg(`⚠️ ${response.error}`);
      } else {
        setStatusType("success");
        setRunStats({ processed: response.processed || 0 });
        setStatusMsg(`✅ Completed! Applied to ${response.processed || 0} jobs successfully.`);
        setLogResults(response.results || []);
        setNaukriConnected(true);
      }
    } catch (err) {
      setStatusType("error");
      setStatusMsg(err instanceof Error ? err.message : "Naukri auto-apply run failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenBrowser = async () => {
    setStatusType("info");
    setStatusMsg(`🌐 Opening browser on ${activePlatform === "linkedin" ? "LinkedIn" : "Naukri"}...`);
    try {
      if (activePlatform === "linkedin") {
        await conveyor.data.launchLinkedInBrowser();
      } else {
        await conveyor.data.launchNaukriBrowser();
      }
      setStatusMsg("✅ Browser opened. You can log in or review the session.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to open browser.");
    }
  };

  const toggleArrayFilter = (arr: string[], setArr: (a: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const isLinkedin = activePlatform === "linkedin";
  const isConnected = isLinkedin ? linkedinConnected : naukriConnected;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-5xl mx-auto py-2">

      {/* ── Platform Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {(["linkedin", "naukri"] as Platform[]).map((p) => {
          const isActive = activePlatform === p;
          const connected = p === "linkedin" ? linkedinConnected : naukriConnected;
          return (
            <button
              key={p}
              onClick={() => {
                setActivePlatform(p);
                setLogResults([]);
                setStatusMsg(null);
                setRunStats(null);
              }}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150",
                isActive
                  ? p === "linkedin"
                    ? "bg-blue-600/15 text-blue-400 border-blue-500/40 shadow-sm"
                    : "bg-emerald-600/15 text-emerald-400 border-emerald-500/40 shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
              )}
            >
              {p === "linkedin" ? (
                <Linkedin className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span className="capitalize">{p === "linkedin" ? "LinkedIn Easy Apply" : "Naukri Auto-Apply"}</span>
              {connected && (
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  p === "linkedin" ? "bg-blue-400" : "bg-emerald-400"
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main Card ─────────────────────────────────────────────────────── */}
      <div className="p-6 bg-card border border-border rounded-2xl space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "p-2 rounded-xl",
                isLinkedin ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
              )}>
                {isLinkedin ? <Rocket className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {isLinkedin ? "LinkedIn Easy Apply Engine" : "Naukri Auto-Apply Engine"}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground pl-11">
              {isLinkedin
                ? "Automated job search, filter application, Easy Apply wizard — adapted from the GodsScion LinkedIn bot"
                : "Automated one-click job search, profile matching, and auto-application for Naukri.com"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenBrowser}
              className="text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Globe className="h-3.5 w-3.5" /> Open Live Browser
            </Button>

            <Badge
              variant={isConnected ? "secondary" : "outline"}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 gap-1.5",
                isConnected
                  ? isLinkedin
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              )}
            >
              {isConnected ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Account Connected</>
              ) : (
                <><AlertCircle className="h-3.5 w-3.5" /> Credentials Missing</>
              )}
            </Badge>
          </div>
        </div>

        {/* ── Credentials ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isLinkedin ? "LinkedIn" : "Naukri"} Email / Username
            </Label>
            <Input
              type="text"
              value={isLinkedin ? linkedinUsername : naukriUsername}
              onChange={(e) => isLinkedin ? setLinkedinUsername(e.target.value) : setNaukriUsername(e.target.value)}
              placeholder={`Enter your ${isLinkedin ? "LinkedIn" : "Naukri"} email`}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Password</Label>
            <Input
              type="password"
              value={isLinkedin ? linkedinPassword : naukriPassword}
              onChange={(e) => isLinkedin ? setLinkedinPassword(e.target.value) : setNaukriPassword(e.target.value)}
              placeholder="••••••••••••"
              className="text-xs"
            />
          </div>
        </div>

        {/* ── Search Config ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Keywords / Role</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. Software Engineer, DevOps"
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isLinkedin ? "e.g. Bangalore, Remote" : "e.g. Bangalore, Delhi NCR"}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Max Applications per Run</Label>
            <select
              value={maxJobs}
              onChange={(e) => setMaxJobs(Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-medium"
            >
              {[5, 10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>{n} Jobs</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── LinkedIn Advanced Filters ──────────────────────────────────── */}
        {isLinkedin && (
          <div className="border border-border/40 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-semibold text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                Advanced Filters
                {(selectedExperience.length + selectedJobType.length + selectedWorkMode.length) > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {selectedExperience.length + selectedJobType.length + selectedWorkMode.length} active
                  </Badge>
                )}
              </span>
              {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showFilters && (
              <div className="p-4 space-y-4">
                {/* Quick toggles */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={easyApplyOnly} onCheckedChange={setEasyApplyOnly} id="easy-apply-only" />
                    <Label htmlFor="easy-apply-only" className="text-xs cursor-pointer">Easy Apply only</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={under10Applicants} onCheckedChange={setUnder10Applicants} id="under-10" />
                    <Label htmlFor="under-10" className="text-xs cursor-pointer">Under 10 applicants</Label>
                  </div>
                </div>

                {/* Date posted */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Date Posted</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "anyTime", label: "Any time" },
                      { value: "pastMonth", label: "Past month" },
                      { value: "pastWeek", label: "Past week" },
                      { value: "past24Hours", label: "Past 24h" },
                    ].map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDatePosted(d.value)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                          datePosted === d.value
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/40"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-blue-500/30"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Experience level */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Experience Level</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "internship", label: "Internship" },
                      { value: "entryLevel", label: "Entry level" },
                      { value: "associate", label: "Associate" },
                      { value: "midSeniorLevel", label: "Mid-Senior" },
                      { value: "director", label: "Director" },
                      { value: "executive", label: "Executive" },
                    ].map((e) => (
                      <button
                        key={e.value}
                        onClick={() => toggleArrayFilter(selectedExperience, setSelectedExperience, e.value)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                          selectedExperience.includes(e.value)
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/40"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-blue-500/30"
                        )}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Job type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Job Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "fullTime", label: "Full-time" },
                      { value: "partTime", label: "Part-time" },
                      { value: "contract", label: "Contract" },
                      { value: "temporary", label: "Temporary" },
                      { value: "internship", label: "Internship" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => toggleArrayFilter(selectedJobType, setSelectedJobType, t.value)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                          selectedJobType.includes(t.value)
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/40"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-blue-500/30"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Work mode */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Work Mode</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "onSite", label: "On-site" },
                      { value: "remote", label: "Remote" },
                      { value: "hybrid", label: "Hybrid" },
                    ].map((m) => (
                      <button
                        key={m.value}
                        onClick={() => toggleArrayFilter(selectedWorkMode, setSelectedWorkMode, m.value)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                          selectedWorkMode.includes(m.value)
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/40"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-blue-500/30"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Run Controls ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Switch checked={pauseBeforeSubmit} onCheckedChange={setPauseBeforeSubmit} id="pause-toggle" />
            <Label htmlFor="pause-toggle" className="text-xs font-medium cursor-pointer">
              Pause for human review before submit
            </Label>
          </div>

          <Button
            onClick={isLinkedin ? handleRunLinkedIn : handleRunNaukri}
            disabled={isRunning}
            size="lg"
            className={cn(
              "gap-2 text-xs font-semibold shadow-md",
              isLinkedin
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            )}
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Running Auto-Apply...</>
            ) : (
              <>
                {isLinkedin ? <Rocket className="h-4 w-4" /> : <Zap className="h-4 w-4 fill-current" />}
                {isLinkedin ? "🚀 Start LinkedIn Auto-Apply" : "⚡ Start Naukri Auto-Apply"}
              </>
            )}
          </Button>
        </div>

        {/* ── Status Bar ────────────────────────────────────────────────── */}
        {statusMsg && (
          <div className={cn(
            "p-3 rounded-xl text-xs flex items-start gap-2 border",
            statusType === "error"
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
              : statusType === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-primary/10 text-primary border-primary/20"
          )}>
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* ── Run Stats ────────────────────────────────────────────────── */}
        {runStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Processed", value: runStats.processed, color: "text-foreground" },
              { label: "Applied", value: runStats.applied ?? runStats.processed, color: "text-emerald-400" },
              { label: "Skipped", value: runStats.skipped ?? 0, color: "text-amber-400" },
              { label: "Failed", value: runStats.failed ?? 0, color: "text-rose-400" },
            ].map((s) => (
              <div key={s.label} className="bg-muted/30 border border-border/40 rounded-xl p-3 text-center">
                <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Results Log ────────────────────────────────────────────────────── */}
      {logResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            Application Run Results
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/40 text-xs">
            {/* Header */}
            <div className="grid grid-cols-12 p-3 bg-muted/40 font-semibold text-muted-foreground">
              <div className="col-span-5 flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> Job & Company</div>
              <div className="col-span-2"><MapPin className="h-3 w-3 inline mr-1" />Location</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Fields</div>
              <div className="col-span-2 text-right">Outcome</div>
            </div>

            {logResults.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 p-3 items-center hover:bg-muted/20 transition-colors">
                <div className="col-span-5">
                  <div className="font-semibold text-foreground">{item.title}</div>
                  <div className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                    <Building2 className="h-2.5 w-2.5" /> {item.company}
                  </div>
                </div>

                <div className="col-span-2 text-muted-foreground text-[11px]">
                  {item.location || "—"}
                </div>

                <div className="col-span-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize text-[10px] gap-1",
                      item.status === "submitted"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : item.status === "skipped"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : item.status === "pending_review"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    )}
                  >
                    {item.status === "submitted" && <CheckCircle2 className="h-3 w-3" />}
                    {item.status === "skipped" && <SkipForward className="h-3 w-3" />}
                    {item.status === "pending_review" && <Clock className="h-3 w-3" />}
                    {item.status === "failed" && <XCircle className="h-3 w-3" />}
                    {item.status}
                  </Badge>
                </div>

                <div className="col-span-1 text-center text-muted-foreground">
                  {item.fieldsFilled != null ? `${item.fieldsFilled}` : "—"}
                </div>

                <div className="col-span-2 text-right text-muted-foreground font-mono text-[10px] truncate pl-2">
                  {item.errorMessage || "Success"}
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};
