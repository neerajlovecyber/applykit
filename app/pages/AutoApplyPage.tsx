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
  const [naukriConnected, setNaukriConnected] = useState(false);

  // ── Search config ───────────────────────────────────────────────────────
  const [keywords, setKeywords] = useState("Software Engineer");
  const [location, setLocation] = useState("");
  const [maxJobs, setMaxJobs] = useState<number>(10);
  const [pauseBeforeSubmit, setPauseBeforeSubmit] = useState(false);

  // ── Naukri creds ────────────────────────────────────────────────────────
  const [naukriUsername, setNaukriUsername] = useState("");
  const [naukriPassword, setNaukriPassword] = useState("");

  // ── LinkedIn advanced filters ───────────────────────────────────────────
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
    loadNaukriCreds();
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

  const loadNaukriCreds = async () => {
    try {
      const raw = await conveyor.data.getSetting("naukri_credentials");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.username) setNaukriUsername(p.username);
        if (p.password) setNaukriPassword(p.password);
      }
      const platform = await conveyor.data.getPlatformById("naukri");
      setNaukriConnected(platform?.status === "connected" || !!platform?.auth_token);
    } catch { /* ignore */ }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Connect / Disconnect
  // ─────────────────────────────────────────────────────────────────────────

  const handleConnectLinkedIn = async () => {
    setLiConnectState("connecting");
    setStatusType("info");
    setStatusMsg("🌐 Opening Chromium browser... Log in to LinkedIn in the window that appears. We'll detect your login automatically.");

    try {
      const res = await conveyor.data.connectLinkedIn(); // long-running, awaits login
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
    setIsRunning(true);
    setLogResults([]);
    setRunStats(null);
    setStatusType("info");
    setStatusMsg("🚀 Starting Naukri auto-apply...");

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
        setStatusMsg(`✅ Applied to ${response.processed || 0} jobs.`);
        setLogResults(response.results || []);
        setNaukriConnected(true);
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-5xl mx-auto py-2">

      {/* ── Platform Tabs ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {(["linkedin", "naukri"] as Platform[]).map((p) => {
          const isActive = activePlatform === p;
          const isConn = p === "linkedin" ? liIsConnected : naukriConnected;
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", isLinkedin ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400")}>
              {isLinkedin ? <Rocket className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isLinkedin ? "LinkedIn Easy Apply Engine" : "Naukri Auto-Apply Engine"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLinkedin
                  ? "Connect once — auto-apply runs forever using your saved session"
                  : "One-click job search and auto-application for Naukri.com"}
              </p>
            </div>
          </div>
        </div>

        {/* ── LinkedIn: Connect Account Card ──────────────────────────────── */}
        {isLinkedin && (
          <div className={cn(
            "rounded-xl border p-4 flex items-center justify-between gap-4 transition-all",
            liIsConnected
              ? "bg-blue-500/8 border-blue-500/25"
              : liIsConnecting
                ? "bg-amber-500/8 border-amber-500/25"
                : "bg-muted/30 border-border/50"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                liIsConnected ? "bg-blue-500/20" : liIsConnecting ? "bg-amber-500/20" : "bg-muted"
              )}>
                {liIsConnected
                  ? <Wifi className="h-5 w-5 text-blue-400" />
                  : liIsConnecting
                    ? <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                    : <WifiOff className="h-5 w-5 text-muted-foreground" />
                }
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  LinkedIn Account
                  {liIsConnected && (
                    <Badge className="text-[10px] px-2 py-0 bg-blue-500/15 text-blue-400 border-blue-500/30">
                      Connected ✓
                    </Badge>
                  )}
                  {liIsConnecting && (
                    <Badge className="text-[10px] px-2 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30">
                      Waiting for login…
                    </Badge>
                  )}
                  {!liIsConnected && !liIsConnecting && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0 text-muted-foreground">
                      Not connected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {liIsConnected
                    ? "Session saved in ApplyKit browser. Auto-apply will use this session."
                    : liIsConnecting
                      ? "Log in to LinkedIn in the browser window that just opened. We'll detect it automatically."
                      : "Click Connect → log in once → session saved permanently."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {liIsConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnectLinkedIn}
                  className="text-xs gap-1.5 text-muted-foreground border-border/60 hover:text-rose-400 hover:border-rose-500/40"
                >
                  <LogOut className="h-3.5 w-3.5" /> Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnectLinkedIn}
                  disabled={liIsConnecting}
                  className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {liIsConnecting
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for login…</>
                    : <><LogIn className="h-3.5 w-3.5" /> Connect LinkedIn</>
                  }
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Naukri: Credentials ─────────────────────────────────────────── */}
        {!isLinkedin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Naukri Email / Username</Label>
              <Input type="text" value={naukriUsername} onChange={(e) => setNaukriUsername(e.target.value)} placeholder="Enter your Naukri email" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Password</Label>
              <Input type="password" value={naukriPassword} onChange={(e) => setNaukriPassword(e.target.value)} placeholder="••••••••••••" className="text-xs" />
            </div>
          </div>
        )}

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

        {/* ── LinkedIn Advanced Filters ───────────────────────────────────── */}
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
                <FilterGroup label="Date Posted" items={[
                  { v: "anyTime", l: "Any time" }, { v: "pastMonth", l: "Past month" },
                  { v: "pastWeek", l: "Past week" }, { v: "past24Hours", l: "Past 24h" },
                ]} selected={[datePosted]} onToggle={(v) => setDatePosted(v)} single />
                {/* Experience */}
                <FilterGroup label="Experience Level" items={[
                  { v: "internship", l: "Internship" }, { v: "entryLevel", l: "Entry level" },
                  { v: "associate", l: "Associate" }, { v: "midSeniorLevel", l: "Mid-Senior" },
                  { v: "director", l: "Director" }, { v: "executive", l: "Executive" },
                ]} selected={selectedExperience} onToggle={(v) => toggleFilter(selectedExperience, setSelectedExperience, v)} />
                {/* Job type */}
                <FilterGroup label="Job Type" items={[
                  { v: "fullTime", l: "Full-time" }, { v: "partTime", l: "Part-time" },
                  { v: "contract", l: "Contract" }, { v: "temporary", l: "Temporary" },
                ]} selected={selectedJobType} onToggle={(v) => toggleFilter(selectedJobType, setSelectedJobType, v)} />
                {/* Work mode */}
                <FilterGroup label="Work Mode" items={[
                  { v: "onSite", l: "On-site" }, { v: "remote", l: "Remote" }, { v: "hybrid", l: "Hybrid" },
                ]} selected={selectedWorkMode} onToggle={(v) => toggleFilter(selectedWorkMode, setSelectedWorkMode, v)} />
              </div>
            )}
          </div>
        )}

        {/* ── Run Controls ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Switch checked={pauseBeforeSubmit} onCheckedChange={setPauseBeforeSubmit} id="pause-toggle" />
            <Label htmlFor="pause-toggle" className="text-xs font-medium cursor-pointer">Pause for human review before submit</Label>
          </div>

          <Button
            onClick={isLinkedin ? handleRunLinkedIn : handleRunNaukri}
            disabled={isRunning || (isLinkedin && !liIsConnected) || liIsConnecting}
            size="lg"
            className={cn(
              "gap-2 text-xs font-semibold shadow-md",
              isLinkedin
                ? liIsConnected
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            )}
          >
            {isRunning
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
              : isLinkedin
                ? liIsConnected
                  ? <><Rocket className="h-4 w-4" /> Start LinkedIn Auto-Apply</>
                  : <><Unplug className="h-4 w-4" /> Connect Account First</>
                : <><Zap className="h-4 w-4 fill-current" /> Start Naukri Auto-Apply</>
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
}> = ({ label, items, selected, onToggle, single }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.v}
          onClick={() => onToggle(item.v)}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
            selected.includes(item.v)
              ? "bg-blue-500/15 text-blue-400 border-blue-500/40"
              : "bg-muted/30 text-muted-foreground border-border hover:border-blue-500/30"
          )}
        >
          {item.l}
        </button>
      ))}
    </div>
  </div>
);
