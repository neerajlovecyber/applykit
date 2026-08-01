import React, { useState, useEffect } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Key,
  Globe,
  Sparkles,
  Loader2,
  Cpu,
  Save,
  Layers,
} from "lucide-react";
import type { Platform } from "@/lib/main/db-queries";
import type { LLMProviderConfig } from "@/lib/providers/types";

const PROVIDER_MODELS_MAP: Record<string, string[]> = {
  openrouter: [
    "google/gemini-2.0-flash-001",
    "deepseek/deepseek-r1",
    "anthropic/claude-3.7-sonnet",
    "openai/gpt-4o-2024-11-20",
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen-2.5-coder-32b-instruct",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "o3-mini",
    "o1",
  ],
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro",
    "gemini-2.0-pro-exp",
  ],
};

export const SettingsPage: React.FC = () => {
  const conveyor = useConveyor();

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [providers, setProviders] = useState<LLMProviderConfig[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>("openrouter");
  const [selectedProviderConfig, setSelectedProviderConfig] = useState<Partial<LLMProviderConfig>>({});

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-001");
  const [customModelInput, setCustomModelInput] = useState("");

  const [testStatus, setTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const dbPlatforms = await conveyor.data.getPlatforms();
      setPlatforms(dbPlatforms);

      const activeId = (await conveyor.data.getSetting("llm_active_provider")) || "openrouter";
      setActiveProviderId(activeId);

      const providerList: LLMProviderConfig[] = await (window as any).electron?.ipcRenderer?.invoke("llm:list-providers") || [
        { id: "openrouter", name: "OpenRouter", type: "openrouter", defaultModel: "google/gemini-2.0-flash-001", availableModels: PROVIDER_MODELS_MAP.openrouter, isEnabled: true },
        { id: "openai", name: "OpenAI", type: "openai", defaultModel: "gpt-4o", availableModels: PROVIDER_MODELS_MAP.openai, isEnabled: true },
        { id: "gemini", name: "Google Gemini", type: "gemini", defaultModel: "gemini-2.0-flash", availableModels: PROVIDER_MODELS_MAP.gemini, isEnabled: true },
      ];
      
      const filteredProviders = providerList.filter(p => p.id !== "ollama");
      setProviders(filteredProviders);

      const activeConfig = filteredProviders.find((p) => p.id === activeId) || filteredProviders[0];
      if (activeConfig) {
        setSelectedProviderConfig(activeConfig);
        setSelectedModel(activeConfig.defaultModel || PROVIDER_MODELS_MAP[activeId]?.[0] || "");
        setBaseUrlInput(activeConfig.baseUrl || "");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleSelectProvider = (id: string) => {
    setActiveProviderId(id);
    const p = providers.find((pr) => pr.id === id);
    const defaultM = p?.defaultModel || PROVIDER_MODELS_MAP[id]?.[0] || "";

    if (p) {
      setSelectedProviderConfig(p);
      setSelectedModel(defaultM);
      setBaseUrlInput(p.baseUrl || "");
      setApiKeyInput("");
      setTestStatus({ testing: false });
    }
  };

  const handleSaveLLM = async () => {
    try {
      const finalModel = customModelInput.trim() || selectedModel;

      const updatedConfig: LLMProviderConfig = {
        id: selectedProviderConfig.id || activeProviderId,
        name: selectedProviderConfig.name || activeProviderId,
        type: selectedProviderConfig.type || (activeProviderId as any),
        apiKey: apiKeyInput.trim() || selectedProviderConfig.apiKey,
        baseUrl: baseUrlInput.trim() || selectedProviderConfig.baseUrl,
        defaultModel: finalModel,
        availableModels: PROVIDER_MODELS_MAP[activeProviderId] || [finalModel],
        isEnabled: true,
      };

      await (window as any).electron?.ipcRenderer?.invoke("llm:configure-provider", updatedConfig);
      await (window as any).electron?.ipcRenderer?.invoke("llm:set-active-provider", updatedConfig.id);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadSettings();
    } catch (err) {
      console.error("Failed to save LLM settings:", err);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus({ testing: true });
    try {
      const finalModel = customModelInput.trim() || selectedModel;

      const configToTest: LLMProviderConfig = {
        id: selectedProviderConfig.id || activeProviderId,
        name: selectedProviderConfig.name || activeProviderId,
        type: selectedProviderConfig.type || (activeProviderId as any),
        apiKey: apiKeyInput.trim() || selectedProviderConfig.apiKey,
        baseUrl: baseUrlInput.trim() || selectedProviderConfig.baseUrl,
        defaultModel: finalModel,
        availableModels: PROVIDER_MODELS_MAP[activeProviderId] || [finalModel],
        isEnabled: true,
      };

      const result = await (window as any).electron?.ipcRenderer?.invoke("llm:test-connection", configToTest);
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

  const togglePlatform = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "connected" ? "disconnected" : "connected";
    await conveyor.data.updatePlatformStatus(id, nextStatus);
    loadSettings();
  };

  const availableModelsForProvider = PROVIDER_MODELS_MAP[activeProviderId] || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* AI Provider Configuration (Vercel AI SDK) */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">AI Provider Engine & Model Config</h3>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Vercel AI SDK
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Select your preferred AI Provider and modern 2026 Model from the dropdowns below to power job fit scoring and answer generation.
          </p>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
          {/* Dual Dropdown Selectors: Provider & Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Provider Dropdown */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" /> AI Provider Dropdown Selector
              </Label>
              <select
                value={activeProviderId}
                onChange={(e) => handleSelectProvider(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-semibold text-foreground"
              >
                <option value="openrouter">OpenRouter (Recommended — Multi-Model API)</option>
                <option value="openai">OpenAI (Direct — GPT-4o, o3-mini)</option>
                <option value="gemini">Google Gemini (Direct — Gemini 2.0 Flash)</option>
              </select>
            </div>

            {/* AI Model Dropdown */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-primary" /> AI Model Dropdown Selector
              </Label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setCustomModelInput("");
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-semibold text-foreground"
              >
                {availableModelsForProvider.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
                <option value="custom">+ Custom Model Name...</option>
              </select>
            </div>
          </div>

          {/* Optional Custom Model Input */}
          {(selectedModel === "custom" || customModelInput) && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Custom Model Identifier</Label>
              <Input
                type="text"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                className="text-xs"
              />
            </div>
          )}

          {/* Config Inputs: API Key & Base URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-border/40">
            <div className="space-y-2">
              <Label className="text-xs font-medium">API Key</Label>
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

          {/* Quick Tab Buttons for Providers */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Provider Tabs</Label>
            <div className="grid grid-cols-3 gap-2">
              {providers.map((p) => {
                const isActive = p.id === activeProviderId;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProvider(p.id)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left flex items-center justify-between ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-background hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <span>{p.name}</span>
                    {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing Connection...
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
                <Save className="h-3.5 w-3.5" /> Save AI Configuration
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Job Platforms */}
      <div className="space-y-4 border-t border-border/50 pt-6">
        <div>
          <h3 className="font-semibold text-lg">Target Job Portals</h3>
          <p className="text-sm text-muted-foreground">Manage platform connectors for job discovery and automated submissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => {
            const isConn = platform.status === "connected";
            return (
              <div key={platform.id} className="p-4 bg-card border border-border rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${isConn ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  <div>
                    <div className="font-medium text-sm">{platform.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {isConn ? "Connected & Active" : "Disconnected"}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={isConn ? "outline" : "default"}
                  onClick={() => togglePlatform(platform.id, platform.status)}
                >
                  {isConn ? "Disconnect" : "Connect"}
                </Button>
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
