import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
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
  Briefcase,
  Check,
  Globe,
  Settings,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

export const NaukriPage: React.FC = () => {
  const conveyor = useConveyor();
  const { activeProfile } = useProfileStore();

  const [keywords, setKeywords] = useState("DevOps Engineer");
  const [location, setLocation] = useState("Gurugram");
  const [experienceYears, setExperienceYears] = useState<number>(2);
  const [jobAgeDays, setJobAgeDays] = useState<number>(30);
  const [workMode, setWorkMode] = useState<string>("any");
  const [maxJobs, setMaxJobs] = useState<number>(10);
  const [pauseBeforeSubmit, setPauseBeforeSubmit] = useState<boolean>(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logResults, setLogResults] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    checkNaukriConnection();
    loadStoredCreds();
    if (activeProfile?.target_titles) {
      try {
        const titles = JSON.parse(activeProfile.target_titles);
        if (Array.isArray(titles) && titles.length > 0) {
          setKeywords(titles[0]);
        }
      } catch {
        // ignore
      }
    }
  }, [activeProfile]);

  const loadStoredCreds = async () => {
    try {
      const raw = await conveyor.data.getSetting("naukri_credentials");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.username) setUsername(parsed.username);
        if (parsed.password) setPassword(parsed.password);
      }
    } catch {
      // ignore
    }
  };

  const checkNaukriConnection = async () => {
    try {
      const platform = await conveyor.data.getPlatformById("naukri");
      setIsConnected(platform?.status === "connected" || !!platform?.auth_token);
    } catch {
      setIsConnected(false);
    }
  };

  const handleRunNaukriAutomation = async () => {
    setIsRunning(true);
    setStatusMsg("🚀 Opening Playwright browser, performing Naukri login, searching jobs with active filters, and auto-applying...");
    setLogResults([]);

    try {
      if (username && password) {
        await conveyor.data.setSetting("naukri_credentials", JSON.stringify({ username, password }));
      }

      const response = await conveyor.data.runNaukriAutoApply({
        keywords,
        location,
        maxJobs,
        filters: {
          experienceYears: experienceYears >= 0 ? experienceYears : undefined,
          jobAgeDays: jobAgeDays > 0 ? jobAgeDays : undefined,
          workMode: workMode !== "any" ? [workMode] : undefined,
        },
        pauseBeforeSubmit,
        username,
        password,
      });

      if (response?.error) {
        setStatusMsg(`Execution notice: ${response.error}`);
      } else {
        setStatusMsg(
          `Completed! Applied to ${response?.processed || 0} jobs successfully.`
        );
        setLogResults(response?.results || []);
      }
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Automation run failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenBrowser = async () => {
    setStatusMsg("🌐 Opening Playwright Browser window on Naukri.com...");
    try {
      await conveyor.data.launchNaukriBrowser();
      setStatusMsg("Browser window opened! You can now guide step by step.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to open browser");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header Banner */}
      <div className="p-6 bg-card border border-border rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Zap className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Naukri Auto-Apply Engine</h2>
            </div>
            <p className="text-sm text-muted-foreground pl-11">
              Automated one-click job search, profile matching, and auto-application for Naukri.com
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenBrowser}
              className="text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Globe className="h-3.5 w-3.5" /> Open Live Browser Window
            </Button>

            <Badge
              variant={isConnected ? "secondary" : "outline"}
              className={`text-xs font-semibold px-3 py-1.5 gap-1.5 ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Account Connected
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" /> Credentials Missing
                </>
              )}
            </Badge>

            {!isConnected && (
              <Link to="/settings">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <Settings className="h-3.5 w-3.5" /> Setup Account
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Centralized Browser Session Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <span>
              {isConnected
                ? "Centralized Browser Session Active — Connected via Chromium browser login. Session cookies are automatically synced."
                : "No active browser session detected. Click 'Connect via Browser' in Settings to log in."}
            </span>
          </div>
          <Link to="/settings">
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
              <Settings className="h-3 w-3" /> Manage Connection
            </Button>
          </Link>
        </div>

        {/* Form Controls Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Search Keywords / Role</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. DevOps Engineer, Full Stack"
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
                placeholder="e.g. Gurugram, Delhi NCR, Remote"
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex items-center flex-wrap gap-1 pt-1">
              <span className="text-[10px] text-muted-foreground mr-0.5">Presets:</span>
              {["Gurugram", "Delhi NCR", "Noida", "Bangalore", "Remote"].map((loc) => (
                <Badge
                  key={loc}
                  variant={location.includes(loc) ? "default" : "outline"}
                  className="text-[10px] px-1.5 py-0.5 cursor-pointer transition-all hover:bg-emerald-500/20"
                  onClick={() => setLocation(loc)}
                >
                  {loc}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Max Applications per Run</Label>
            <Select value={String(maxJobs)} onValueChange={(v) => setMaxJobs(Number(v))}>
              <SelectTrigger className="text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Jobs</SelectItem>
                <SelectItem value="10">10 Jobs</SelectItem>
                <SelectItem value="20">20 Jobs</SelectItem>
                <SelectItem value="30">30 Jobs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Form Controls Row 2 — Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/30">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Job Freshness / Age</Label>
            <Select value={String(jobAgeDays)} onValueChange={(v) => setJobAgeDays(Number(v))}>
              <SelectTrigger className="text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">⚡ Past 24 Hours (1 Day)</SelectItem>
                <SelectItem value="3">🔥 Past 3 Days</SelectItem>
                <SelectItem value="7">📅 Past 7 Days (1 Week)</SelectItem>
                <SelectItem value="15">📆 Past 15 Days</SelectItem>
                <SelectItem value="30">🗓️ Past 30 Days (1 Month)</SelectItem>
                <SelectItem value="0">🌐 Any Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Experience Level</Label>
            <Select value={String(experienceYears)} onValueChange={(v) => setExperienceYears(Number(v))}>
              <SelectTrigger className="text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">Any Experience</SelectItem>
                <SelectItem value="0">0 Years (Freshers)</SelectItem>
                <SelectItem value="1">1 Year</SelectItem>
                <SelectItem value="2">2 Years</SelectItem>
                <SelectItem value="3">3 Years</SelectItem>
                <SelectItem value="5">5 Years</SelectItem>
                <SelectItem value="7">7 Years</SelectItem>
                <SelectItem value="10">10+ Years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Work Mode</Label>
            <Select value={workMode} onValueChange={(v) => setWorkMode(v)}>
              <SelectTrigger className="text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Work Mode</SelectItem>
                <SelectItem value="remote">🏠 Remote Only</SelectItem>
                <SelectItem value="hybrid">🏢 Hybrid</SelectItem>
                <SelectItem value="onSite">🏬 On-site / Office</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Switch
              checked={pauseBeforeSubmit}
              onCheckedChange={setPauseBeforeSubmit}
              id="pause-toggle"
            />
            <Label htmlFor="pause-toggle" className="text-xs font-medium cursor-pointer">
              Pause for human review before final submit
            </Label>
          </div>

          <Button
            onClick={handleRunNaukriAutomation}
            disabled={isRunning}
            size="lg"
            className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Running Naukri Ninja...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-current" /> ⚡ Start One-Click Naukri Auto-Apply
              </>
            )}
          </Button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isRunning
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Live Log Results Table */}
      {logResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Automation Application Results</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/40 text-xs">
            <div className="grid grid-cols-12 p-3 bg-muted/40 font-semibold text-muted-foreground">
              <div className="col-span-5">Job Title & Company</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-2">Fields Filled</div>
              <div className="col-span-2 text-right">Outcome</div>
            </div>

            {logResults.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 p-3 items-center hover:bg-muted/20">
                <div className="col-span-5">
                  <div className="font-semibold text-foreground">{item.title}</div>
                  <div className="text-muted-foreground text-[11px]">{item.company}</div>
                </div>

                <div className="col-span-3">
                  <Badge
                    variant="outline"
                    className={`capitalize text-[11px] ${
                      item.success
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {item.status}
                  </Badge>
                </div>

                <div className="col-span-2 text-muted-foreground">
                  {item.fieldsFilled || 0} fields
                </div>

                <div className="col-span-2 text-right text-muted-foreground font-mono text-[11px]">
                  {item.errorMessage || "Success"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
