import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
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
} from "lucide-react";
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
  openrouter: { label: "Get OpenRouter API Key", url: "https://openrouter.ai/workspaces/default/keys" },
  openai: { label: "Get OpenAI API Key", url: "https://platform.openai.com/api-keys" },
  gemini: { label: "Get Google Gemini API Key", url: "https://aistudio.google.com/app/apikey" },
};

const PLATFORM_META: Record<string, { desc: string; iconBg: string; textCol: string; label: string }> = {
  naukri: { desc: "India's #1 Job Portal & Automated Apply", iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20", textCol: "text-blue-400", label: "Naukri" },
  linkedin: { desc: "Professional Network & Easy Apply", iconBg: "bg-sky-500/10 text-sky-400 border-sky-500/20", textCol: "text-sky-400", label: "LinkedIn" },
  indeed: { desc: "Global Job Search Engine", iconBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", textCol: "text-indigo-400", label: "Indeed" },
  greenhouse: { desc: "Direct ATS Application Portal", iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", textCol: "text-emerald-400", label: "Greenhouse" },
  lever: { desc: "Applicant Tracking Platform", iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/20", textCol: "text-purple-400", label: "Lever" },
  workday: { desc: "Enterprise Corporate Career Portal", iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20", textCol: "text-amber-400", label: "Workday" },
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

  // ── Direct Platform Credentials State per Platform ──────────────────────────
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string; token: string }>>({});
  const [portalStatus, setPortalStatus] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});

  // ── Load settings once on mount ────────────────────────────────────────────
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [dbPlatforms, savedActiveId, providerList, naukriConn, liConn] = await Promise.all([
        conveyor.data.getPlatforms(),
        conveyor.data.getSetting("llm_active_provider"),
        conveyor.data.listProviders(),
        conveyor.data.isNaukriConnected().catch(() => ({ connected: false })),
        conveyor.data.isLinkedInConnected().catch(() => ({ connected: false })),
      ]);

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
        setApiKeyInput(activeConfig.apiKey || "");
        setIsEditingKey(!activeConfig.apiKey);
      }
    } catch (err) {
      console.error("[SettingsPage] Failed to load settings:", err);
    }
  };

  // ── 100% Pure Dynamic Model Fetching ──────────────────────────────────────
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
      setApiKeyInput(p.apiKey || "");
      setIsEditingKey(!p.apiKey);
    }
    const nextDefaultModel = p?.defaultModel || DEFAULT_MODELS_BY_PROVIDER[id] || "openrouter/free";
    setSelectedModel(nextDefaultModel);
  };

  const handleSaveLLM = async () => {
    try {
      const finalModel = customModelInput.trim() || selectedModel;

      const updatedConfig: LLMProviderConfig = {
        id: selectedProviderConfig.id ?? activeProviderId,
        name: selectedProviderConfig.name ?? activeProviderId,
        type: selectedProviderConfig.type ?? (activeProviderId as any),
        apiKey: apiKeyInput.trim() || selectedProviderConfig.apiKey,
        baseUrl: baseUrlInput.trim() || selectedProviderConfig.baseUrl,
        defaultModel: finalModel,
        availableModels: dynamicModels.map((m) => m.id),
        isEnabled: true,
      };

      await conveyor.data.configureProvider(updatedConfig);
      await conveyor.data.setActiveLLMProvider(updatedConfig.id);

      setSaveSuccess(true);
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
        setTestStatus({ testing: false, success: false, message: result?.error || "Connection failed." });
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
        message: "🌐 Opening Chromium browser... Please log in to your account in the browser window.",
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
            message: res?.error || "Connection attempt cancelled or failed.",
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

  const getProviderDisplayName = (id: string) => {
    if (id === "openrouter") return "OpenRouter";
    if (id === "openai") return "OpenAI";
    if (id === "gemini") return "Google Gemini";
    return id.toUpperCase();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* AI Provider Configuration Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">AI Configuration</h3>
            <p className="text-sm text-muted-foreground">Select your AI provider and model for resume tailoring and job scoring.</p>
          </div>
          <div>
            {selectedProviderConfig.apiKey ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Key className="h-3.5 w-3.5" /> API Key Missing
              </span>
            )}
          </div>
        </div>

        {/* Locked Card UX vs Editable Form UX */}
        {!isEditingKey && selectedProviderConfig.apiKey ? (
          /* Sleek Locked Summary Card (Credit Card / Secure Credentials Style) */
          <div className="p-6 bg-card border border-emerald-500/30 rounded-xl shadow-sm relative overflow-hidden space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ProviderIcon providerId={activeProviderId} className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base text-foreground">
                      {getProviderDisplayName(activeProviderId)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Encrypted API Key saved in SQLite database for local AI execution.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testStatus.testing} className="gap-1.5 text-xs font-semibold">
                  {testStatus.testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Test
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditingKey(true)} className="gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10">
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </div>

            {/* Summary Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-primary" /> Active Model
                </span>
                <p className="font-semibold text-foreground truncate font-mono">{selectedModel}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Key className="h-3 w-3 text-emerald-400" /> Stored Key
                </span>
                <p className="font-mono text-emerald-400 font-semibold">{selectedProviderConfig.apiKey}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Globe className="h-3 w-3 text-primary" /> Base Endpoint
                </span>
                <p className="font-mono text-foreground truncate">{baseUrlInput || "Default Provider URL"}</p>
              </div>
            </div>

            {/* Status Message */}
            {testStatus.message && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  testStatus.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {testStatus.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>
        ) : (
          /* Editable Configuration Card */
          <div className="p-5 bg-card border border-border rounded-xl space-y-5 shadow-sm">
            {/* Provider & Model Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Provider Dropdown */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Provider</Label>
                <select
                  value={activeProviderId}
                  onChange={(e) => handleSelectProvider(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-semibold text-foreground"
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              {/* Model Searchable Combobox */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Model ({dynamicModels?.length || 0} available)</Label>
                  {isLoadingModels && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
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
            </div>

            {/* Custom Model Input */}
            {(selectedModel === "custom" || customModelInput) && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Custom Model ID</Label>
                <Input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free"
                  className="text-xs font-mono"
                />
              </div>
            )}

            {/* Config Inputs: API Key & Base URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-border/40">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">API Key</Label>
                  {PROVIDER_KEY_LINKS[activeProviderId] && (
                    <a
                      href={PROVIDER_KEY_LINKS[activeProviderId].url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      {PROVIDER_KEY_LINKS[activeProviderId].label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter Provider API Key"
                    className="pr-8 text-xs font-mono"
                  />
                  <Key className="h-4 w-4 text-muted-foreground absolute right-2.5 top-2.5" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Base URL (Optional Override)</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder={selectedProviderConfig.baseUrl || "Default Provider URL"}
                    className="pr-8 text-xs font-mono"
                  />
                  <Globe className="h-4 w-4 text-muted-foreground absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Status Message */}
            {testStatus.message && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  testStatus.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {testStatus.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                <span>{testStatus.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testStatus.testing}
                className="gap-2 text-xs"
              >
                {testStatus.testing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" /> Test
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2">
                {saveSuccess && <span className="text-xs text-emerald-400 font-medium">Settings Saved!</span>}
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

      {/* Connected Job Platforms */}
      <div className="space-y-4 border-t border-border/50 pt-6">
        <div>
          <h3 className="font-semibold text-lg">Target Job Portals</h3>
          <p className="text-sm text-muted-foreground">
            Centralized browser session connectors. Click connect to log in via Chromium and save session cookies automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {platforms.map((platform) => {
            const isConn = platform.status === "connected";
            const statusInfo = portalStatus[platform.id] || {};
            const meta = PLATFORM_META[platform.id] || {
              desc: "Automated Job Application Portal",
              iconBg: "bg-primary/10 text-primary border-primary/20",
              textCol: "text-foreground",
              label: platform.name || platform.id,
            };

            return (
              <div
                key={platform.id}
                className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-xs hover:border-border transition-colors flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${meta.iconBg}`}>
                      {meta.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div>
                        <span className="font-semibold text-sm text-foreground truncate">{meta.label}</span>
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
                        className="text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
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
                        {statusInfo.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                {statusInfo.message && (
                  <div className={`p-2.5 rounded-lg text-xs ${statusInfo.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-muted/50 text-muted-foreground border border-border/40"}`}>
                    {statusInfo.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
