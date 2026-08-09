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
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  MapPin,
  Linkedin,
  ChevronDown,
  ChevronUp,
  Filter,
  Rocket,
  SkipForward,
  Clock,
  Briefcase,
  Building2,
  LogIn,
  LogOut,
  Unplug,
  Wifi,
  WifiOff,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Platform = "linkedin" | "naukri";
type ConnectState = "idle" | "connecting" | "connected" | "disconnected";

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

  // ── Connection state ────────────────────────────────────────────────────
  const [liConnectState, setLiConnectState] = useState<ConnectState>("idle");
  const [naukriConnectState, setNaukriConnectState] = useState<ConnectState>("idle");

  // ── Search config ───────────────────────────────────────────────────────
  const [keywords, setKeywords] = useState("Software Engineer");
  const [location, setLocation] = useState("");
  const [maxJobs, setMaxJobs] = useState<number>(10);
  const [pauseBeforeSubmit, setPauseBeforeSubmit] = useState(false);

  // ── Advanced filters ───────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [easyApplyOnly, setEasyApplyOnly] = useState(true);
  const [under10Applicants, setUnder10Applicants] = useState(false);
  const [datePosted, setDatePosted] = useState<string>("anyTime");
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [selectedJobType, setSelectedJobType] = useState<string[]>([]);
  const [selectedWorkMode, setSelectedWorkMode] = useState<string[]>([]);

  // ── Run state ───────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [logResults, setLogResults] = useState<RunResult[]>([]);
  const [runStats, setRunStats] = useState<RunStats | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    checkLinkedInConnection();
    checkNaukriConnection();
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

  const checkLinkedInConnection = async () => {
    try {
      const res = await conveyor.data.isLinkedInConnected();
      setLiConnectState(res?.connected ? "connected" : "disconnected");
    } catch {
      setLiConnectState("disconnected");
    }
  };

  const checkNaukriConnection = async () => {
    try {
      const res = await conveyor.data.isNaukriConnected();
      setNaukriConnectState(res?.connected ? "connected" : "disconnected");
    } catch {
      setNaukriConnectState("disconnected");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Connect / Disconnect
  // ─────────────────────────────────────────────────────────────────────────

  const handleConnectLinkedIn = async () => {
    setLiConnectState("connecting");
    setStatusType("info");
    setStatusMsg("🌐 Opening Chromium browser... Log in to LinkedIn in the window that appears. We'll detect your login automatically.");

    try {
      const res = await conveyor.data.connectLinkedIn();
      if (res?.success) {
        setLiConnectState("connected");
        setStatusType("success");
        setStatusMsg("✅ LinkedIn connected! Your session is saved — auto-apply is ready to go.");
      } else {
        setLiConnectState("disconnected");
        setStatusType("error");
        setStatusMsg(`⚠️ ${res?.error || "Login not detected. Please try again."}`);
      }
    } catch (err) {
      setLiConnectState("disconnected");
      setStatusType("error");
      setStatusMsg(err instanceof Error ? err.message : "Connection failed.");
    }
  };

  const handleDisconnectLinkedIn = async () => {
    await conveyor.data.disconnectLinkedIn();
    setLiConnectState("disconnected");
    setStatusMsg("LinkedIn disconnected. Your session cookies are kept — reconnecting will be instant.");
    setStatusType("info");
  };

  const handleConnectNaukri = async () => {
    setNaukriConnectState("connecting");
    setStatusType("info");
    setStatusMsg("🌐 Opening Chromium browser... Log in to Naukri in the window that appears. We'll detect your login automatically.");

    try {
      const res = await conveyor.data.connectNaukri();
      if (res?.success) {
        setNaukriConnectState("connected");
        setStatusType("success");
        setStatusMsg("✅ Naukri connected! Your session is saved — auto-apply is ready to go.");
      } else {
        setNaukriConnectState("disconnected");
        setStatusType("error");
        setStatusMsg(`⚠️ ${res?.error || "Login not detected. Please try again."}`);
      }
    } catch (err) {
      setNaukriConnectState("disconnected");
      setStatusType("error");
      setStatusMsg(err instanceof Error ? err.message : "Connection failed.");
    }
  };

  const handleDisconnectNaukri = async () => {
    await conveyor.data.disconnectNaukri();
    setNaukriConnectState("disconnected");
    setStatusMsg("Naukri disconnected. Your session cookies are kept — reconnecting will be instant.");
    setStatusType("info");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-apply runners
  // ─────────────────────────────────────────────────────────────────────────

  const handleRunLinkedIn = async () => {
    if (liConnectState !== "connected") {
      setStatusType("error");
      setStatusMsg("⚠️ Please connect your LinkedIn account first.");
      return;
    }
    setIsRunning(true);
    setLogResults([]);
    setRunStats(null);
    setStatusType("info");
    setStatusMsg("🚀 Auto-apply started — navigating LinkedIn job search, applying with Easy Apply...");

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
        setStatusMsg(`✅ Done! Applied: ${response.applied || 0} | Skipped: ${response.skipped || 0} | Failed: ${response.failed || 0}`);
        setLogResults(response.results || []);
      }
    } catch (err) {
      setStatusType("error");
      setStatusMsg(err instanceof Error ? err.message : "Auto-apply failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunNaukri = async () => {
    if (naukriConnectState !== "connected") {
      setStatusType("error");
      setStatusMsg("⚠️ Please connect your Naukri account first.");
      return;
    }
    setIsRunning(true);
    setLogResults([]);
    setRunStats(null);
    setStatusType("info");
    setStatusMsg("🚀 Auto-apply started — navigating Naukri job search, applying to postings...");

    try {
      const response = await conveyor.data.runNaukriAutoApply({
        keywords,
        location: location || undefined,
        maxJobs,
        filters: {
          easyApplyOnly,
          datePosted: datePosted as any,
          experienceLevel: selectedExperience.length ? selectedExperience : undefined,
          workMode: selectedWorkMode.length ? selectedWorkMode : undefined,
        },
        pauseBeforeSubmit,
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
        setStatusMsg(`✅ Done! Applied: ${response.applied || 0} | Skipped: ${response.skipped || 0} | Failed: ${response.failed || 0}`);
        setLogResults(response.results || []);
      }
    } catch (err) {
      setStatusType("error");
      setStatusMsg(err instanceof Error ? err.message : "Naukri auto-apply failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const toggleFilter = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const isLinkedin = activePlatform === "linkedin";
  const liIsConnected = liConnectState === "connected";
  const liIsConnecting = liConnectState === "connecting";
  const naukriIsConnected = naukriConnectState === "connected";
  const naukriIsConnecting = naukriConnectState === "connecting";

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-5xl mx-auto py-2">

      {/* ── Platform Tabs ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {(["linkedin", "naukri"] as Platform[]).map((p) => {
          const isActive = activePlatform === p;
          const isConn = p === "linkedin" ? liIsConnected : naukriIsConnected;
          return (
            <button
              key={p}
              onClick={() => { setActivePlatform(p); setLogResults([]); setStatusMsg(null); setRunStats(null); }}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150",
                isActive
                  ? p === "linkedin"
                    ? "bg-blue-600/15 text-blue-400 border-blue-500/40 shadow-sm"
                    : "bg-emerald-600/15 text-emerald-400 border-emerald-500/40 shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
              )}
            >
              {p === "linkedin" ? <Linkedin className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              <span>{p === "linkedin" ? "LinkedIn Easy Apply" : "Naukri Auto-Apply"}</span>
              {isConn && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 animate-pulse", p === "linkedin" ? "bg-blue-400" : "bg-emerald-400")} />}
            </button>
          );
        })}
      </div>

      {/* ── Main Card ───────────────────────────────────────────────────────── */}
      <div className="p-6 bg-card border border-border rounded-2xl space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl shrink-0", isLinkedin ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400")}>
              {isLinkedin ? <Rocket className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">
                  {isLinkedin ? "LinkedIn Easy Apply Engine" : "Naukri Auto-Apply Engine"}
                </h2>
                <Badge
                  variant={(isLinkedin ? liIsConnected : naukriIsConnected) ? "secondary" : "outline"}
                  className={cn(
                    "text-xs font-semibold px-2.5 py-0.5 gap-1.5 transition-all",
                    (isLinkedin ? liIsConnected : naukriIsConnected)
                      ? isLinkedin ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : (isLinkedin ? liIsConnecting : naukriIsConnecting)
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", (isLinkedin ? liIsConnected : naukriIsConnected) ? (isLinkedin ? "bg-blue-400" : "bg-emerald-400") : (isLinkedin ? liIsConnecting : naukriIsConnecting) ? "bg-amber-400 animate-ping" : "bg-muted-foreground")} />
                  {(isLinkedin ? liIsConnected : naukriIsConnected) ? "Connected ✓" : (isLinkedin ? liIsConnecting : naukriIsConnecting) ? "Waiting for login…" : "Disconnected"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLinkedin
                  ? "Automated batch search & application using your saved LinkedIn session."
                  : "Automated batch search & application across Naukri jobs seamlessly."}
              </p>
            </div>
          </div>

          {!(isLinkedin ? liIsConnected : naukriIsConnected) && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Button
                size="sm"
                onClick={isLinkedin ? handleConnectLinkedIn : handleConnectNaukri}
                disabled={isLinkedin ? liIsConnecting : naukriIsConnecting}
                className={cn("text-xs h-8 gap-1.5 text-white", isLinkedin ? "bg-blue-600 hover:bg-blue-500" : "bg-emerald-600 hover:bg-emerald-500")}
              >
                {(isLinkedin ? liIsConnecting : naukriIsConnecting)
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Logging in…</>
                  : <><LogIn className="h-3.5 w-3.5" /> Connect {isLinkedin ? "LinkedIn" : "Naukri"}</>
                }
              </Button>
            </div>
          )}
        </div>

        {/* ── Search Config ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/40">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Keywords / Role</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. Software Engineer, DevOps" className="pl-9 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={isLinkedin ? "e.g. Bangalore, Remote" : "e.g. Bangalore"} className="pl-9 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Max Applications per Run</Label>
            <select
              value={maxJobs}
              onChange={(e) => setMaxJobs(Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-medium"
            >
              {[5, 10, 20, 30, 50].map((n) => <option key={n} value={n}>{n} Jobs</option>)}
            </select>
          </div>
        </div>

        {/* ── Advanced Filters ───────────────────────────────────────────── */}
        <div className="border border-border/40 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-semibold text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              Advanced Filters
              {(selectedExperience.length + selectedJobType.length + selectedWorkMode.length) > 0 && (
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", isLinkedin ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30")}>
                  {selectedExperience.length + selectedJobType.length + selectedWorkMode.length} active
                </Badge>
              )}
            </span>
            {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showFilters && (
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={easyApplyOnly} onCheckedChange={setEasyApplyOnly} id="easy-apply-only" />
                  <Label htmlFor="easy-apply-only" className="text-xs cursor-pointer">{isLinkedin ? "Easy Apply only" : "Single-click / Direct Apply only"}</Label>
                </div>
                {isLinkedin && (
                  <div className="flex items-center gap-2">
                    <Switch checked={under10Applicants} onCheckedChange={setUnder10Applicants} id="under-10" />
                    <Label htmlFor="under-10" className="text-xs cursor-pointer">Under 10 applicants</Label>
                  </div>
                )}
              </div>

              {/* Date posted */}
              <FilterGroup label="Date Posted" items={[
                { v: "anyTime", l: "Any time" }, { v: "pastMonth", l: "Past month" },
                { v: "pastWeek", l: "Past week" }, { v: "past24Hours", l: "Past 24h" },
              ]} selected={[datePosted]} onToggle={(v) => setDatePosted(v)} single activePlatform={activePlatform} />

              {/* Experience */}
              <FilterGroup label="Experience Level" items={
                isLinkedin ? [
                  { v: "internship", l: "Internship" }, { v: "entryLevel", l: "Entry level" },
                  { v: "associate", l: "Associate" }, { v: "midSeniorLevel", l: "Mid-Senior" },
                  { v: "director", l: "Director" }, { v: "executive", l: "Executive" },
                ] : [
                  { v: "freshers", l: "Freshers (0 yrs)" }, { v: "1to3Years", l: "1-3 Years" },
                  { v: "3to5Years", l: "3-5 Years" }, { v: "5to10Years", l: "5-10 Years" },
                  { v: "10plusYears", l: "10+ Years" },
                ]
              } selected={selectedExperience} onToggle={(v) => toggleFilter(selectedExperience, setSelectedExperience, v)} activePlatform={activePlatform} />

              {/* Job type (LinkedIn) */}
              {isLinkedin && (
                <FilterGroup label="Job Type" items={[
                  { v: "fullTime", l: "Full-time" }, { v: "partTime", l: "Part-time" },
                  { v: "contract", l: "Contract" }, { v: "temporary", l: "Temporary" },
                ]} selected={selectedJobType} onToggle={(v) => toggleFilter(selectedJobType, setSelectedJobType, v)} activePlatform={activePlatform} />
              )}

              {/* Work mode */}
              <FilterGroup label="Work Mode" items={[
                { v: "onSite", l: "On-site" }, { v: "remote", l: "Remote" }, { v: "hybrid", l: "Hybrid" },
              ]} selected={selectedWorkMode} onToggle={(v) => toggleFilter(selectedWorkMode, setSelectedWorkMode, v)} activePlatform={activePlatform} />
            </div>
          )}
        </div>

        {/* ── Run Controls ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Switch checked={pauseBeforeSubmit} onCheckedChange={setPauseBeforeSubmit} id="pause-toggle" />
            <Label htmlFor="pause-toggle" className="text-xs font-medium cursor-pointer">Pause for human review before submit</Label>
          </div>

          <Button
            onClick={isLinkedin ? handleRunLinkedIn : handleRunNaukri}
            disabled={isRunning || (isLinkedin ? !liIsConnected || liIsConnecting : !naukriIsConnected || naukriIsConnecting)}
            size="lg"
            className={cn(
              "gap-2 text-xs font-semibold shadow-md text-white",
              isLinkedin
                ? liIsConnected
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
                : naukriIsConnected
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isRunning
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
              : isLinkedin
                ? liIsConnected
                  ? <><Rocket className="h-4 w-4" /> Start LinkedIn Auto-Apply</>
                  : <><Unplug className="h-4 w-4" /> Connect Account First</>
                : naukriIsConnected
                  ? <><Zap className="h-4 w-4 fill-current" /> Start Naukri Auto-Apply</>
                  : <><Unplug className="h-4 w-4" /> Connect Account First</>
            }
          </Button>
        </div>

        {/* ── Status ──────────────────────────────────────────────────────── */}
        {statusMsg && (
          <div className={cn(
            "p-3 rounded-xl text-xs flex items-start gap-2 border",
            statusType === "error" ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
              : statusType === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-primary/10 text-primary border-primary/20"
          )}>
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{statusMsg}</span>
          </div>
        )}

        {/* ── Stats ───────────────────────────────────────────────────────── */}
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

      {/* ── Results Log ─────────────────────────────────────────────────────── */}
      {logResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Application Results
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/40 text-xs">
            <div className="grid grid-cols-12 p-3 bg-muted/40 font-semibold text-muted-foreground">
              <div className="col-span-5">Job & Company</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Fields</div>
              <div className="col-span-2 text-right">Note</div>
            </div>
            {logResults.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 p-3 items-center hover:bg-muted/20 transition-colors">
                <div className="col-span-5">
                  <div className="font-semibold text-foreground truncate">{item.title}</div>
                  <div className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                    <Building2 className="h-2.5 w-2.5" /> {item.company}
                  </div>
                </div>
                <div className="col-span-2 text-muted-foreground text-[11px] truncate">{item.location || "—"}</div>
                <div className="col-span-2">
                  <Badge variant="outline" className={cn(
                    "capitalize text-[10px] gap-1",
                    item.status === "submitted" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : item.status === "skipped" ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : item.status === "pending_review" ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  )}>
                    {item.status === "submitted" && <CheckCircle2 className="h-3 w-3" />}
                    {item.status === "skipped" && <SkipForward className="h-3 w-3" />}
                    {item.status === "pending_review" && <Clock className="h-3 w-3" />}
                    {item.status === "failed" && <XCircle className="h-3 w-3" />}
                    {item.status}
                  </Badge>
                </div>
                <div className="col-span-1 text-center text-muted-foreground">{item.fieldsFilled ?? "—"}</div>
                <div className="col-span-2 text-right text-muted-foreground font-mono text-[10px] truncate pl-2">{item.errorMessage || "Success"}</div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FilterGroup helper
// ─────────────────────────────────────────────────────────────────────────────

const FilterGroup: React.FC<{
  label: string;
  items: { v: string; l: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  single?: boolean;
  activePlatform?: Platform;
}> = ({ label, items, selected, onToggle, activePlatform = "linkedin" }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isSel = selected.includes(item.v);
        return (
          <button
            key={item.v}
            onClick={() => onToggle(item.v)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
              isSel
                ? activePlatform === "linkedin"
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/40"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
            )}
          >
            {item.l}
          </button>
        );
      })}
    </div>
  </div>
);
