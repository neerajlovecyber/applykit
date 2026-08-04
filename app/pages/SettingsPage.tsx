import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
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
} from "lucide-react";
import type { Platform } from "@/lib/main/db-queries";
import type { LLMProviderConfig } from "@/lib/providers/types";
import { ProviderModel } from "@/lib/providers/model-fetcher";

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

  // ── UI state ───────────────────────────────────────────────────────────────
  const [testStatus, setTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // ── Direct Platform Credentials State per Platform ──────────────────────────
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string; token: string }>>({});
  const [portalStatus, setPortalStatus] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});

  // ── Load settings once on mount ────────────────────────────────────────────
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [dbPlatforms, savedActiveId, providerList] = await Promise.all([
        conveyor.data.getPlatforms(),
        conveyor.data.getSetting("llm_active_provider"),
        conveyor.data.listProviders(),
      ]);

      setPlatforms(dbPlatforms);

      // Pre-fill token inputs from DB for connected platforms
      const initialCreds: Record<string, { username: string; password: string; token: string }> = {};
      for (const p of dbPlatforms) {
        initialCreds[p.id] = { username: "", password: "", token: p.auth_token || "" };
      }
      setCredentials((prev) => ({ ...initialCreds, ...prev }));

      const activeId = ALLOWED_PROVIDERS.includes(savedActiveId ?? "") ? (savedActiveId ?? "openrouter") : "openrouter";
      setActiveProviderId(activeId);

      const filtered: LLMProviderConfig[] = (providerList ?? []).filter((p: LLMProviderConfig) =>
        ALLOWED_PROVIDERS.includes(p.id)
      );
      setProviders(filtered);

      const activeConfig = filtered.find((p) => p.id === activeId) ?? filtered[0];
      if (activeConfig) {
        setSelectedProviderConfig(activeConfig);
        setSelectedModel(activeConfig.defaultModel || DEFAULT_MODELS_BY_PROVIDER[activeId] || "openrouter/free");
        setBaseUrlInput(activeConfig.baseUrl ?? "");
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
  const handleSelectProvider = (id: string) => {
    setActiveProviderId(id);
    setCustomModelInput("");
    setApiKeyInput("");
    setTestStatus({ testing: false });

    const p = providers.find((pr) => pr.id === id);
    if (p) {
      setSelectedProviderConfig(p);
      setBaseUrlInput(p.baseUrl ?? "");
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

  const updateCredState = (platformId: string, field: "username" | "password" | "token", val: string) => {
    setCredentials((prev) => ({
      ...prev,
      [platformId]: {
        ...(prev[platformId] || { username: "", password: "", token: "" }),
        [field]: val,
      },
    }));
  };

  const handleSaveAndTestPortal = async (platformId: string) => {
    const cred = credentials[platformId] || { username: "", password: "", token: "" };
    setPortalStatus((prev) => ({ ...prev, [platformId]: { loading: true } }));

    try {
      if (platformId === "naukri") {
        if (cred.token.trim()) {
          await conveyor.data.updatePlatformAuthToken("naukri", cred.token.trim(), "connected");
          setPortalStatus((prev) => ({
            ...prev,
            [platformId]: { loading: false, success: true, message: "Naukri connected via Auth Token!" },
          }));
          loadSettings();
          return;
        }

        if (!cred.username || !cred.password) {
          setPortalStatus((prev) => ({
            ...prev,
            [platformId]: { loading: false, success: false, message: "Please enter Username and Password." },
          }));
          return;
        }

        const res = await conveyor.data.loginNaukri({ username: cred.username, password: cred.password });
        if (res.success) {
          setPortalStatus((prev) => ({
            ...prev,
            [platformId]: { loading: false, success: true, message: "Naukri logged in & connected successfully!" },
          }));
          loadSettings();
        } else {
          setPortalStatus((prev) => ({
            ...prev,
            [platformId]: { loading: false, success: false, message: res.errorMessage || "Login failed" },
          }));
        }
      } else {
        if (cred.token.trim()) {
          await conveyor.data.updatePlatformAuthToken(platformId, cred.token.trim(), "connected");
        } else {
          await conveyor.data.updatePlatformStatus(platformId, "connected");
        }
        setPortalStatus((prev) => ({
          ...prev,
          [platformId]: { loading: false, success: true, message: `${platformId} connected!` },
        }));
        loadSettings();
      }
    } catch (err) {
      setPortalStatus((prev) => ({
        ...prev,
        [platformId]: {
          loading: false,
          success: false,
          message: err instanceof Error ? err.message : "Authentication error",
        },
      }));
    }
  };

  const handleDisconnectPortal = async (platformId: string) => {
    await conveyor.data.updatePlatformStatus(platformId, "disconnected");
    setPortalStatus((prev) => ({
      ...prev,
      [platformId]: { loading: false, success: false, message: "Disconnected" },
    }));
    loadSettings();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* AI Provider Configuration */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">AI Configuration</h3>
          <p className="text-sm text-muted-foreground">Select your AI provider and model for resume tailoring and job scoring.</p>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
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
                  placeholder={selectedProviderConfig.apiKey ? "••••••••••••••••" : "Enter Provider API Key"}
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
          <div className="flex items-center justify-between pt-2">
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
                  <RefreshCw className="h-3.5 w-3.5" /> Test Connection
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {saveSuccess && <span className="text-xs text-emerald-400 font-medium">Settings Saved!</span>}
              <Button size="sm" onClick={handleSaveLLM} className="gap-2 text-xs">
                <Save className="h-3.5 w-3.5" /> Save Configuration
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Job Platforms */}
      <div className="space-y-4 border-t border-border/50 pt-6">
        <div>
          <h3 className="font-semibold text-lg">Target Job Portals</h3>
          <p className="text-sm text-muted-foreground">Enter your portal credentials to log in and enable job search & auto-apply</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => {
            const isConn = platform.status === "connected";
            const cred = credentials[platform.id] || { username: "", password: "", token: platform.auth_token || "" };
            const statusInfo = portalStatus[platform.id] || {};

            return (
              <div key={platform.id} className="p-4 bg-card border border-border rounded-xl space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${isConn ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                    <div className="font-medium text-sm text-foreground">{platform.name}</div>
                  </div>

                  <div className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {isConn ? "Connected & Active" : "Disconnected"}
                  </div>
                </div>

                {/* Direct Username / Email Field */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Username / Email</Label>
                  <Input
                    type="text"
                    value={cred.username}
                    onChange={(e) => updateCredState(platform.id, "username", e.target.value)}
                    placeholder="Enter your email or username..."
                    className="text-xs h-9"
                  />
                </div>

                {/* Direct Password Field */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Password</Label>
                  <Input
                    type="password"
                    value={cred.password}
                    onChange={(e) => updateCredState(platform.id, "password", e.target.value)}
                    placeholder="••••••••••••"
                    className="text-xs h-9"
                  />
                </div>

                {/* Optional Auth Token */}
                <div className="space-y-1.5 pt-1 border-t border-border/30">
                  <Label className="text-[11px] text-muted-foreground">Or Session Auth Token (Optional)</Label>
                  <Input
                    type="password"
                    value={cred.token}
                    onChange={(e) => updateCredState(platform.id, "token", e.target.value)}
                    placeholder="Bearer or cookie token..."
                    className="text-xs h-8 font-mono"
                  />
                </div>

                {/* Status Feedback */}
                {statusInfo.message && (
                  <div
                    className={`p-2 rounded text-xs flex items-center gap-1.5 ${
                      statusInfo.success ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {statusInfo.success ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                    <span>{statusInfo.message}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  {isConn ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnectPortal(platform.id)}
                      className="text-xs h-8 text-rose-400 hover:text-rose-300"
                    >
                      Disconnect
                    </Button>
                  ) : <div />}

                  <Button
                    size="sm"
                    onClick={() => handleSaveAndTestPortal(platform.id)}
                    disabled={statusInfo.loading}
                    className="text-xs h-8 gap-1.5"
                  >
                    {statusInfo.loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" /> Save & Test Connection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4 border-t border-border/50 pt-6">
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
          <div>
            <div className="font-medium text-sm">Desktop Notifications</div>
            <div className="text-xs text-muted-foreground">Get notified when job discovery or application runs complete</div>
          </div>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>
      </div>
    </div>
  );
};
