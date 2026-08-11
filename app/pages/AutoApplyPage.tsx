import React, { useState, useEffect, useRef } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { useExecutionStore } from "@/app/stores/execution-store";
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
  Linkedin,
  ChevronDown,
  ChevronUp,
  Filter,
  Rocket,
  SkipForward,
  Clock,
  Briefcase,
  Building2,
  Unplug,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ContinuousTabs } from "@/app/components/ui/continuous-tabs";

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
// AutoApplyPage - Ultra-Sleek Command Center
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

  const {
    isRunning,
    statusMsg,
    statusType,
    logResults,
    runStats,
    startExecution,
    updateStatus,
    finishExecution,
  } = useExecutionStore();

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
    setStatusMsg("🌐 Opening Chromium browser... Log in to LinkedIn in the window that appears.");

    try {
      const res = await conveyor.data.connectLinkedIn();
      if (res?.success) {
        setLiConnectState("connected");
        setStatusType("success");
        setStatusMsg("✅ LinkedIn connected! Session saved.");
      } else {
        setLiConnectState("disconnected");
        setStatusType("error");
        setStatusMsg(`⚠️ ${res?.error || "Login not detected."}`);
      }
    } catch (err) {
      setLiConnectState("disconnected");
      setStatusType("error");
      setStatusMsg(err instanceof Error ? err.message : "Connection failed.");
    }
  };

  const handleConnectNaukri = async () => {
    setNaukriConnectState("connecting");
    setStatusType("info");
    setStatusMsg("🌐 Opening Chromium browser... Log in to Naukri in the window that appears.");

    try {
      const res = await conveyor.data.connectNaukri();
      if (res?.success) {
        setNaukriConnectState("connected");
        setStatusType("success");
        setStatusMsg("✅ Naukri connected! Session saved.");
      } else {
        setNaukriConnectState("disconnected");
        setStatusType("error");
        setStatusMsg(`⚠️ ${res?.error || "Login not detected."}`);
      }
    } catch (err) {
      setNaukriConnectState("disconnected");
      setStatusType("error");
      setStatusMsg(err instanceof Error ? err.message : "Connection failed.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-apply runners
  // ─────────────────────────────────────────────────────────────────────────

  const handleRunLinkedIn = async () => {
    if (liConnectState !== "connected") {
      updateStatus("⚠️ Please connect your LinkedIn account first.", "error");
      return;
    }
    startExecution("linkedin", "🚀 Auto-apply started — navigating LinkedIn job search...");

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
        finishExecution(false, `⚠️ ${response.error}`);
      } else {
        const stats = {
          processed: response.processed || 0,
          applied: response.applied || 0,
          skipped: response.skipped || 0,
          failed: response.failed || 0,
        };
        finishExecution(
          true,
          `✅ Done! Applied: ${response.applied || 0} | Skipped: ${response.skipped || 0} | Failed: ${response.failed || 0}`,
          stats,
          response.results || []
        );
      }
    } catch (err) {
      finishExecution(false, err instanceof Error ? err.message : "Auto-apply failed.");
    }
  };

  const handleRunNaukri = async () => {
    if (naukriConnectState !== "connected") {
      updateStatus("⚠️ Please connect your Naukri account first.", "error");
      return;
    }
    startExecution("naukri", "🚀 Auto-apply started — navigating Naukri job search...");

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
        finishExecution(false, `⚠️ ${response.error}`);
      } else {
        const stats = {
          processed: response.processed || 0,
          applied: response.applied || 0,
          skipped: response.skipped || 0,
          failed: response.failed || 0,
        };
        finishExecution(
          true,
          `✅ Done! Applied: ${response.applied || 0} | Skipped: ${response.skipped || 0} | Failed: ${response.failed || 0}`,
          stats,
          response.results || []
        );
      }
    } catch (err) {
      finishExecution(false, err instanceof Error ? err.message : "Naukri auto-apply failed.");
    }
  };

  const toggleFilter = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const isLinkedin = activePlatform === "linkedin";
  const liIsConnected = liConnectState === "connected";
  const liIsConnecting = liConnectState === "connecting";
  const naukriIsConnected = naukriConnectState === "connected";
  const naukriIsConnecting = naukriConnectState === "connecting";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Header & Platform Toggle Bar ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" /> Auto-Apply Bot
        </h1>

        {/* Watermelon Continuous Tabs Platform Switcher */}
        <ContinuousTabs
          value={activePlatform}
          onValueChange={(id) => setActivePlatform(id as Platform)}
          tabs={[
            {
              id: "linkedin",
              label: (
                <div className="flex items-center gap-1.5">
                  <Linkedin className="h-3.5 w-3.5 text-blue-400" />
                  <span>LinkedIn</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      liIsConnected ? "bg-blue-400" : "bg-muted-foreground/40"
                    )}
                    title={liIsConnected ? "Connected" : "Disconnected"}
                  />
                </div>
              ),
            },
            {
              id: "naukri",
              label: (
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-sky-400 fill-current" />
                  <span>Naukri</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      naukriIsConnected ? "bg-sky-400" : "bg-muted-foreground/40"
                    )}
                    title={naukriIsConnected ? "Connected" : "Disconnected"}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Main Form Control Card ────────────────────────────────────────── */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Job Title / Keywords</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. DevOps Engineer, Full Stack"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bangalore, Remote, India"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Applications Goal</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={maxJobs}
              onChange={(e) => setMaxJobs(Math.max(1, parseInt(e.target.value) || 10))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
          >
            <Filter className="h-3.5 w-3.5" /> Advanced Search Filters
            {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <div className="flex items-center gap-2">
            <Switch id="pause-mode" checked={pauseBeforeSubmit} onCheckedChange={setPauseBeforeSubmit} />
            <Label htmlFor="pause-mode" className="text-xs cursor-pointer">Pause & review before submit</Label>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="pt-3 space-y-4 border-t border-border/40">
            <FilterGroup
              label="Work Mode"
              items={[
                { v: "remote", l: "Remote" },
                { v: "hybrid", l: "Hybrid" },
                { v: "onSite", l: "On-site" },
              ]}
              selected={selectedWorkMode}
              onToggle={(v) => toggleFilter(selectedWorkMode, setSelectedWorkMode, v)}
              activePlatform={activePlatform}
            />

            <FilterGroup
              label="Experience Level"
              items={[
                { v: "entry", l: "Entry Level" },
                { v: "associate", l: "Associate" },
                { v: "midSenior", l: "Mid-Senior" },
                { v: "director", l: "Director" },
              ]}
              selected={selectedExperience}
              onToggle={(v) => toggleFilter(selectedExperience, setSelectedExperience, v)}
              activePlatform={activePlatform}
            />
          </div>
        )}

        {/* Launch Button */}
        <div className="pt-3 flex justify-end">
          <Button
            onClick={isLinkedin ? handleRunLinkedIn : handleRunNaukri}
            disabled={isRunning || (isLinkedin ? !liIsConnected || liIsConnecting : !naukriIsConnected || naukriIsConnecting)}
            size="lg"
            className={cn(
              "gap-2 text-xs font-semibold shadow-md text-white px-6 transition-all",
              isLinkedin
                ? liIsConnected
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
                : naukriIsConnected
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Running Batch Apply…</>
            ) : isLinkedin ? (
              liIsConnected ? <><Rocket className="h-4 w-4" /> Start LinkedIn Auto-Apply</> : <><Unplug className="h-4 w-4" /> Connect LinkedIn First</>
            ) : (
              naukriIsConnected ? <><Zap className="h-4 w-4 fill-current" /> Start Naukri Auto-Apply</> : <><Unplug className="h-4 w-4" /> Connect Naukri First</>
            )}
          </Button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={cn(
            "p-3 rounded-xl text-xs flex items-start gap-2 border mt-3",
            statusType === "error" ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
              : statusType === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-primary/10 text-primary border-primary/20"
          )}>
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{statusMsg}</span>
          </div>
        )}

        {/* Run Stats */}
        {runStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {[
              { label: "Jobs Processed", value: runStats.processed, color: "text-foreground" },
              { label: "Successfully Applied", value: runStats.applied ?? runStats.processed, color: "text-emerald-400" },
              { label: "Skipped / Existing", value: runStats.skipped ?? 0, color: "text-amber-400" },
              { label: "Failed / Needs Review", value: runStats.failed ?? 0, color: "text-rose-400" },
            ].map((s) => (
              <div key={s.label} className="bg-muted/30 border border-border/40 rounded-xl p-3 text-center">
                <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Stream Table */}
      {logResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Live Run Stream ({logResults.length})
            </h3>
            <Link to="/dashboard" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              View in Dashboard <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/40 text-xs shadow-sm">
            <div className="grid grid-cols-12 p-3 bg-muted/40 font-semibold text-muted-foreground">
              <div className="col-span-5">Job & Company</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Fields</div>
              <div className="col-span-2 text-right">Details</div>
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
