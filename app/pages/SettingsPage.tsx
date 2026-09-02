import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { ModelCombobox } from "@/app/components/ui/model-combobox";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Key,
  Globe,
  Loader2,
  Save,
  ExternalLink,
  Lock,
  Edit3,
  ShieldCheck,
  Cpu,
  Sparkles,
  Info,
  DownloadCloud,
  Sliders,
  Terminal,
  Database,
  Check,
} from "lucide-react";
import { Github } from "@/components/icons/brand-icons";
import type { Platform } from "@/lib/main/db-queries";
import type { LLMProviderConfig } from "@/lib/providers/types";
import { ProviderModel } from "@/lib/providers/model-fetcher";
import { ProviderIcon } from "@/app/components/ui/provider-icons";

const ALLOWED_PROVIDERS = ["openrouter", "openai", "gemini"];

const DEFAULT_MODELS_BY_PROVIDER: Record<string, string> = {
  openrouter: "openrouter/free",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
};

const PROVIDER_KEY_LINKS: Record<string, { label: string; url: string }> = {
  openrouter: { label: "Get OpenRouter Key", url: "https://openrouter.ai/workspaces/default/keys" },
  openai: { label: "Get OpenAI Key", url: "https://platform.openai.com/api-keys" },
  gemini: { label: "Get Gemini Key", url: "https://aistudio.google.com/app/apikey" },
};

const PROVIDER_CARDS_META: Record<string, { name: string; tag: string; desc: string; iconBg: string }> = {
  openrouter: {
    name: "OpenRouter",
    tag: "Free & Paid Models",
    desc: "Access 300+ LLMs including Llama 3.3, DeepSeek R1, Claude, and free models.",
    iconBg: "bg-muted text-foreground border-border/40",
  },
  openai: {
    name: "OpenAI",
    tag: "Official API",
    desc: "Native integration for GPT-4o, GPT-4o-mini, and custom OpenAI endpoints.",
    iconBg: "bg-muted text-foreground border-border/40",
  },
  gemini: {
    name: "Google Gemini",
    tag: "Generous Rate Limits",
    desc: "Direct connection for Gemini 2.0 Flash, Gemini Pro, and multimodal models.",
    iconBg: "bg-muted text-foreground border-border/40",
  },
};

const PLATFORM_META: Record<string, { desc: string; iconBg: string; textCol: string; label: string }> = {
  naukri: { desc: "India's #1 Job Portal & Automated Apply", iconBg: "bg-muted text-foreground border-border/40", textCol: "text-foreground", label: "Naukri" },
  linkedin: { desc: "Professional Network & Easy Apply", iconBg: "bg-muted text-foreground border-border/40", textCol: "text-foreground", label: "LinkedIn" },
  indeed: { desc: "Global Job Search Engine", iconBg: "bg-muted text-foreground border-border/40", textCol: "text-foreground", label: "Indeed" },
  greenhouse: { desc: "Direct ATS Application Portal", iconBg: "bg-muted text-foreground border-border/40", textCol: "text-foreground", label: "Greenhouse" },
  lever: { desc: "Applicant Tracking Platform", iconBg: "bg-muted text-foreground border-border/40", textCol: "text-foreground", label: "Lever" },
  workday: { desc: "Enterprise Corporate Career Portal", iconBg: "bg-muted text-foreground border-border/40", textCol: "text-foreground", label: "Workday" },
};

export const SettingsPage: React.FC = () => {
  const conveyor = useConveyor();

  // ── Provider / Config state ────────────────────────────────────────────────
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [providers, setProviders] = useState<LLMProviderConfig[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>("openrouter");
  const [selectedProviderConfig, setSelectedProviderConfig] = useState<Partial<LLMProviderConfig>>({});

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("openrouter/free");
  const [customModelInput, setCustomModelInput] = useState("");
  const [isEditingKey, setIsEditingKey] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [testStatus, setTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Version & Updater State ────────────────────────────────────────────────
  const [appVersion, setAppVersion] = useState("0.1.0-alpha.1");
  const [updateStatus, setUpdateStatus] = useState<{ checking: boolean; result?: string; isError?: boolean }>({ checking: false });

  // ── Direct Platform Credentials State per Platform ──────────────────────────
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string; token: string }>>({});
  const [portalStatus, setPortalStatus] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});

  // ── Load settings once on mount ────────────────────────────────────────────
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [dbPlatforms, savedActiveId, providerList, naukriConn, liConn, versionStr] = await Promise.all([
        conveyor.data.getPlatforms(),
        conveyor.data.getSetting("llm_active_provider"),
        conveyor.data.listProviders(),
        conveyor.data.isNaukriConnected().catch(() => ({ connected: false })),
        conveyor.data.isLinkedInConnected().catch(() => ({ connected: false })),
        conveyor.data.getAppVersion().catch(() => "0.1.0-alpha.1"),
      ]);

      if (versionStr) setAppVersion(versionStr);

      const updatedPlatforms = (dbPlatforms || []).map((p: Platform) => {
        if (p.id === "naukri") {
          return { ...p, status: naukriConn?.connected ? "connected" : p.status };
        }
        if (p.id === "linkedin") {
          return { ...p, status: liConn?.connected ? "connected" : p.status };
        }
        return p;
      });

      setPlatforms(updatedPlatforms);

      // Pre-fill token inputs from DB for connected platforms
      const initialCreds: Record<string, { username: string; password: string; token: string }> = {};
      for (const p of dbPlatforms) {
        initialCreds[p.id] = { username: "", password: "", token: p.auth_token || "" };
      }
      setCredentials((prev) => ({ ...initialCreds, ...prev }));

      const filtered: LLMProviderConfig[] = (providerList ?? []).filter((p: LLMProviderConfig) =>
        ALLOWED_PROVIDERS.includes(p.id)
      );
      setProviders(filtered);

      // Auto-select configured provider if savedActiveId is empty or not in allowed list
      const providerWithKey = filtered.find((p) => p.apiKey && p.apiKey.trim() !== "");
      const activeId = ALLOWED_PROVIDERS.includes(savedActiveId ?? "")
        ? savedActiveId!
        : (providerWithKey?.id ?? "openrouter");

      setActiveProviderId(activeId);

      const activeConfig = filtered.find((p) => p.id === activeId) ?? providerWithKey ?? filtered[0];
      if (activeConfig) {
        setSelectedProviderConfig(activeConfig);
        setSelectedModel(activeConfig.defaultModel || DEFAULT_MODELS_BY_PROVIDER[activeId] || "openrouter/free");
        setBaseUrlInput(activeConfig.baseUrl ?? "");
        setApiKeyInput("");
        setIsEditingKey(!activeConfig.apiKey);
      }
    } catch (err) {
      console.error("[SettingsPage] Failed to load settings:", err);
    }
  };

  // ── Dynamic Model Fetching ──────────────────────────────────────────────────
  const {
    data: dynamicModels = [],
    isFetching: isLoadingModels,
    error: modelsError,
  } = useQuery<ProviderModel[]>({
    queryKey: ["models", activeProviderId, apiKeyInput || selectedProviderConfig?.apiKey],
    queryFn: async () => {
      const res = await conveyor.data.fetchProviderModels(
        activeProviderId,
        apiKeyInput.trim() || selectedProviderConfig?.apiKey
      );
      return res || [];
    },
    enabled: !!activeProviderId,
    staleTime: 60 * 1000,
  });

  if (modelsError) {
    console.error("[SettingsPage] Models query error:", modelsError);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectProvider = async (id: string) => {
    setActiveProviderId(id);
    setCustomModelInput("");
    setTestStatus({ testing: false });

    await conveyor.data.setActiveLLMProvider(id).catch(() => {});

    const p = providers.find((pr) => pr.id === id);
    if (p) {
      setSelectedProviderConfig(p);
      setBaseUrlInput(p.baseUrl ?? "");
      setApiKeyInput("");
      setIsEditingKey(!p.apiKey);
    }
    const nextDefaultModel = p?.defaultModel || DEFAULT_MODELS_BY_PROVIDER[id] || "openrouter/free";
    setSelectedModel(nextDefaultModel);
  };

  const handleSaveLLM = async () => {
    try {
      const finalModel = customModelInput.trim() || selectedModel;
      const finalKey = apiKeyInput.trim() || selectedProviderConfig.apiKey || "";

      const updatedConfig: LLMProviderConfig = {
        id: selectedProviderConfig.id ?? activeProviderId,
        name: selectedProviderConfig.name ?? activeProviderId,
        type: selectedProviderConfig.type ?? (activeProviderId as any),
        apiKey: finalKey,
        baseUrl: baseUrlInput.trim() || selectedProviderConfig.baseUrl,
        defaultModel: finalModel,
        availableModels: dynamicModels.map((m) => m.id),
        isEnabled: true,
      };

      await conveyor.data.configureProvider(updatedConfig);
      await conveyor.data.setActiveLLMProvider(updatedConfig.id);

      setSaveSuccess(true);
      setApiKeyInput("");
      setIsEditingKey(false);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadSettings();
    } catch (err) {
      console.error("[SettingsPage] Failed to save LLM settings:", err);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus({ testing: true });
    try {
      const finalModel = customModelInput.trim() || selectedModel;

      const configToTest: LLMProviderConfig = {
        id: selectedProviderConfig.id ?? activeProviderId,
        name: selectedProviderConfig.name ?? activeProviderId,
        type: selectedProviderConfig.type ?? (activeProviderId as any),
        apiKey: apiKeyInput.trim() || selectedProviderConfig.apiKey,
        baseUrl: baseUrlInput.trim() || selectedProviderConfig.baseUrl,
        defaultModel: finalModel,
        availableModels: [finalModel],
        isEnabled: true,
      };

      const result = await conveyor.data.testProviderConnection(configToTest);
      if (result?.success) {
        setTestStatus({ testing: false, success: true, message: "Connection successful! Provider ready." });
      } else {
        setTestStatus({ testing: false, success: false, message: result?.error || "Connection failed. Check API key." });
      }
    } catch (err) {
      setTestStatus({
        testing: false,
        success: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
    }
  };

  const handleConnectPortal = async (platformId: string) => {
    setPortalStatus((prev) => ({
      ...prev,
      [platformId]: {
        loading: true,
        message: "🌐 Opening Chromium browser... Log in to your account in the browser window.",
      },
    }));

    try {
      let res: { success: boolean; error?: string; message?: string } | undefined;

      if (platformId === "naukri") {
        res = await conveyor.data.connectNaukri();
      } else if (platformId === "linkedin") {
        res = await conveyor.data.connectLinkedIn();
      } else {
        const cred = credentials[platformId] || { username: "", password: "", token: "" };
        if (cred.token.trim()) {
          await conveyor.data.updatePlatformAuthToken(platformId, cred.token.trim(), "connected");
          res = { success: true, message: `${platformId} connected via session token!` };
        } else {
          await conveyor.data.updatePlatformStatus(platformId, "connected");
          res = { success: true, message: `${platformId} connected!` };
        }
      }

      if (res?.success) {
        setPortalStatus((prev) => ({
          ...prev,
          [platformId]: {
            loading: false,
            success: true,
            message: res.message || "Connected & session saved successfully!",
          },
        }));
        await loadSettings();
      } else {
        setPortalStatus((prev) => ({
          ...prev,
          [platformId]: {
            loading: false,
            success: false,
            message: res?.error || "Connection cancelled.",
          },
        }));
      }
    } catch (err) {
      setPortalStatus((prev) => ({
        ...prev,
        [platformId]: {
          loading: false,
          success: false,
          message: err instanceof Error ? err.message : "Failed to open portal browser.",
        },
      }));
    }
  };

  const handleDisconnectPortal = async (platformId: string) => {
    setPortalStatus((prev) => ({ ...prev, [platformId]: { loading: true } }));
    try {
      if (platformId === "naukri") {
        await conveyor.data.disconnectNaukri();
      } else if (platformId === "linkedin") {
        await conveyor.data.disconnectLinkedIn();
      } else {
        await conveyor.data.updatePlatformStatus(platformId, "disconnected");
      }
      setPortalStatus((prev) => ({
        ...prev,
        [platformId]: { loading: false, success: false, message: "Disconnected" },
      }));
      await loadSettings();
    } catch (err) {
      console.error("[SettingsPage] Disconnect error:", err);
    }
  };

  const handleCheckUpdates = async () => {
    setUpdateStatus({ checking: true });
    try {
      const res = await conveyor.data.checkForUpdates();
      if (res?.success) {
        if (res?.updateInfo?.version) {
          setUpdateStatus({ checking: false, result: `New update available: v${res.updateInfo.version}!` });
        } else {
          setUpdateStatus({ checking: false, result: `ApplyKit is up to date (v${res.version || appVersion}).` });
        }
      } else if (res?.isPackaged === false) {
        setUpdateStatus({ checking: false, result: `Development build (v${res.version || appVersion}). Auto-updater activates in production release.` });
      } else {
        setUpdateStatus({ checking: false, result: res?.error || res?.message || "Check complete — no new release found.", isError: !!res?.error });
      }
    } catch (err) {
      setUpdateStatus({ checking: false, result: "Failed to check for updates.", isError: true });
    }
  };

  const getProviderDisplayName = (id: string) => {
    if (id === "openrouter") return "OpenRouter";
    if (id === "openai") return "OpenAI";
    if (id === "gemini") return "Google Gemini";
    return id.toUpperCase();
  };

  const getMaskedApiKey = (key?: string) => {
    if (!key || key.trim() === "") return "No key configured";
    if (key.length <= 10) return "••••••••" + key.slice(-4);
    return key.slice(0, 6) + "••••••••" + key.slice(-4);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Sliders className="h-6 w-6 text-foreground" />
            Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure local AI models, job portal sessions, and system updates.
          </p>
        </div>

        <Badge variant="outline" className="text-xs px-2.5 py-1 font-mono font-normal bg-muted/40 border-border/60">
          v{appVersion}
        </Badge>
      </div>

      {/* ── SECTION 1: AI Provider & Engine ────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> AI Engine & Model Provider
          </h2>
          <span className="text-xs text-muted-foreground">
            Active: <span className="font-semibold text-foreground">{getProviderDisplayName(activeProviderId)}</span>
          </span>
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ALLOWED_PROVIDERS.map((pId) => {
            const meta = PROVIDER_CARDS_META[pId];
            const isSelected = activeProviderId === pId;

            return (
              <button
                key={pId}
                type="button"
                onClick={() => handleSelectProvider(pId)}
                className={`p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "bg-card border-border shadow-xs"
                    : "bg-card/40 border-border/40 hover:bg-card/80 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${meta.iconBg}`}>
                      <ProviderIcon providerId={pId} className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">{meta.name}</span>
                  </div>

                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected ? "border-foreground bg-foreground text-background" : "border-border/80 bg-transparent"
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{meta.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Config / Vault Card */}
        {!isEditingKey && selectedProviderConfig.apiKey ? (
          /* Locked View */
          <div className="p-5 bg-card border border-border/80 rounded-xl space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground shrink-0">
                  <ProviderIcon providerId={activeProviderId} className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {getProviderDisplayName(activeProviderId)} Configured
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testStatus.testing}
                  className="gap-1.5 text-xs"
                >
                  {testStatus.testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Test Connection
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingKey(true)}
                  className="gap-1.5 text-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Key
                </Button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="h-3 w-3" /> Model
                </span>
                <p className="font-semibold text-foreground truncate font-mono text-xs">{selectedModel}</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Stored Key
                </span>
                <p className="font-mono text-foreground font-semibold text-xs truncate">
                  {getMaskedApiKey(selectedProviderConfig.apiKey)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Base URL
                </span>
                <p className="font-mono text-foreground truncate text-xs">{baseUrlInput || "Default Endpoint"}</p>
              </div>
            </div>

            {testStatus.message && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  testStatus.success
                    ? "bg-muted border border-border text-foreground"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {testStatus.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>
        ) : (
          /* Editable Form */
          <div className="p-5 bg-card border border-border rounded-xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Key className="h-4 w-4" /> Configure {getProviderDisplayName(activeProviderId)}
              </h3>
              {PROVIDER_KEY_LINKS[activeProviderId] && (
                <a
                  href={PROVIDER_KEY_LINKS[activeProviderId].url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline font-medium"
                >
                  {PROVIDER_KEY_LINKS[activeProviderId].label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Model ({dynamicModels?.length || 0} models)</Label>
                  {isLoadingModels && <Loader2 className="h-3 w-3 animate-spin text-foreground" />}
                </div>
                <ModelCombobox
                  options={dynamicModels}
                  value={selectedModel}
                  onChange={(val) => {
                    setSelectedModel(val);
                    setCustomModelInput("");
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">API Key</Label>
                  {selectedProviderConfig.apiKey && (
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Key Saved in DB
                    </span>
                  )}
                </div>
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    selectedProviderConfig.apiKey
                      ? "•••••••••••• (Saved — leave blank to keep)"
                      : activeProviderId === "openrouter"
                      ? "Optional for openrouter/free (sk-or-...)"
                      : "Enter Provider API Key"
                  }
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {(selectedModel === "custom" || customModelInput) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Custom Model Identifier</Label>
                <Input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free"
                  className="text-xs font-mono"
                />
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-border/30">
              <Label className="text-xs font-semibold">Base URL (Optional Override)</Label>
              <Input
                type="text"
                value={baseUrlInput}
                onChange={(e) => setBaseUrlInput(e.target.value)}
                placeholder={selectedProviderConfig.baseUrl || "Default Provider URL"}
                className="text-xs font-mono"
              />
            </div>

            {testStatus.message && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  testStatus.success
                    ? "bg-muted border border-border text-foreground"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {testStatus.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                <span>{testStatus.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testStatus.testing}
                className="gap-2 text-xs"
              >
                {testStatus.testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Test Connection
              </Button>

              <div className="flex items-center gap-2">
                {saveSuccess && <span className="text-xs text-foreground font-semibold">Saved!</span>}
                {isEditingKey && selectedProviderConfig.apiKey && (
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingKey(false)} className="text-xs">
                    Cancel
                  </Button>
                )}
                <Button size="sm" onClick={handleSaveLLM} className="gap-2 text-xs font-semibold">
                  <Save className="h-3.5 w-3.5" /> Save Configuration
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 2: Target Job Portals ─────────────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4" /> Target Job Portals
        </h2>

        <div className="p-3.5 rounded-lg bg-card/40 border border-border/60 flex items-start gap-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Click <span className="font-semibold text-foreground">Connect</span> to launch an isolated Chromium browser window. Log in to your target job portal, and ApplyKit will securely save session cookies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {platforms.map((platform) => {
            const isConn = platform.status === "connected";
            const statusInfo = portalStatus[platform.id] || {};
            const meta = PLATFORM_META[platform.id] || {
              desc: "Automated Job Application Portal",
              iconBg: "bg-muted text-foreground border-border",
              textCol: "text-foreground",
              label: platform.name || platform.id,
            };

            return (
              <div
                key={platform.id}
                className="p-4 rounded-xl border border-border/70 bg-card/50 hover:bg-card/80 transition-colors flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${meta.iconBg}`}>
                      {meta.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">{meta.label}</span>
                        {isConn && (
                          <span className="h-2 w-2 rounded-full bg-foreground shrink-0" title="Connected" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{meta.desc}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isConn ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnectPortal(platform.id)}
                        disabled={statusInfo.loading}
                        className="text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-medium"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnectPortal(platform.id)}
                        disabled={statusInfo.loading}
                        className="gap-1.5 text-xs font-semibold"
                      >
                        {statusInfo.loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Globe className="h-3.5 w-3.5" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                {statusInfo.message && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-medium ${
                      statusInfo.success
                        ? "bg-muted border border-border text-foreground"
                        : "bg-muted/50 text-muted-foreground border border-border/40"
                    }`}
                  >
                    {statusInfo.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 3: System & Release Updates ─────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> System & Updates
        </h2>

        <div className="p-5 bg-card border border-border/80 rounded-xl space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">ApplyKit Desktop</span>
                  <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border font-mono">
                    v{appVersion}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated Job Application Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://github.com/neerajlovecyber/applykit"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub Repo
                <ExternalLink className="h-3 w-3" />
              </a>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCheckUpdates}
                disabled={updateStatus.checking}
                className="gap-2 text-xs font-semibold"
              >
                {updateStatus.checking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <DownloadCloud className="h-3.5 w-3.5" />
                )}
                Check for Updates
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Terminal className="h-3 w-3" /> Stack
              </span>
              <p className="font-semibold text-foreground font-mono text-xs">Electron 34 • React 19</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Database className="h-3 w-3" /> Storage
              </span>
              <p className="font-semibold text-foreground font-mono text-xs">Local Encrypted SQLite</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Updates
              </span>
              <p className="font-semibold text-foreground font-mono text-xs">GitHub Releases</p>
            </div>
          </div>

          {updateStatus.result && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 font-medium ${
                updateStatus.isError
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-muted border border-border text-foreground"
              }`}
            >
              {updateStatus.isError ? <XCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <span>{updateStatus.result}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
