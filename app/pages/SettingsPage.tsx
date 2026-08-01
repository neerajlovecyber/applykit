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

interface DiscoveredModel {
  id: string;
  name: string;
  isFree?: boolean;
  context_length?: number;
}

const DEFAULT_OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini", "o3-mini", "o1"];
const DEFAULT_GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"];

export const SettingsPage: React.FC = () => {
  const conveyor = useConveyor();

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [providers, setProviders] = useState<LLMProviderConfig[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>("openrouter");
  const [selectedProviderConfig, setSelectedProviderConfig] = useState<Partial<LLMProviderConfig>>({});

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("deepseek/deepseek-r1:free");
  const [customModelInput, setCustomModelInput] = useState("");

  // Live dynamic models state
  const [openRouterModels, setOpenRouterModels] = useState<DiscoveredModel[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const [testStatus, setTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Automatically fetch settings & live OpenRouter models in background on load
  useEffect(() => {
    loadSettings();
    loadLiveOpenRouterModels();
  }, []);

  const loadSettings = async () => {
    try {
      const dbPlatforms = await conveyor.data.getPlatforms();
      setPlatforms(dbPlatforms);

      const activeId = (await conveyor.data.getSetting("llm_active_provider")) || "openrouter";
      setActiveProviderId(activeId);

      const providerList: LLMProviderConfig[] = await (window as any).electron?.ipcRenderer?.invoke("llm:list-providers") || [
        { id: "openrouter", name: "OpenRouter", type: "openrouter", defaultModel: "deepseek/deepseek-r1:free", availableModels: [], isEnabled: true },
        { id: "openai", name: "OpenAI", type: "openai", defaultModel: "gpt-4o-mini", availableModels: DEFAULT_OPENAI_MODELS, isEnabled: true },
        { id: "gemini", name: "Google Gemini", type: "gemini", defaultModel: "gemini-1.5-flash", availableModels: DEFAULT_GEMINI_MODELS, isEnabled: true },
      ];

      setProviders(providerList.filter((p) => p.id !== "ollama"));

      const activeConfig = providerList.find((p) => p.id === activeId) || providerList[0];
      if (activeConfig) {
        setSelectedProviderConfig(activeConfig);
        setSelectedModel(activeConfig.defaultModel || "deepseek/deepseek-r1:free");
        setBaseUrlInput(activeConfig.baseUrl || "");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const loadLiveOpenRouterModels = async () => {
    setIsFetchingModels(true);
    try {
      const list: DiscoveredModel[] = await (window as any).electron?.ipcRenderer?.invoke("llm:fetch-openrouter-models");
      if (list && list.length > 0) {
        setOpenRouterModels(list);
      }
    } catch (err) {
      console.error("Failed to fetch live OpenRouter models:", err);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSelectProvider = (id: string) => {
    setActiveProviderId(id);
    const p = providers.find((pr) => pr.id === id);
    const defaultM = id === "openrouter" ? "deepseek/deepseek-r1:free" : (id === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash");

    if (p) {
      setSelectedProviderConfig(p);
      setSelectedModel(defaultM);
      setBaseUrlInput(p.baseUrl || "");
      setApiKeyInput("");
      setTestStatus({ testing: false });
    }

    if (id === "openrouter" && openRouterModels.length === 0) {
      loadLiveOpenRouterModels();
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
        availableModels: activeProviderId === "openrouter" ? openRouterModels.map((m) => m.id) : (activeProviderId === "openai" ? DEFAULT_OPENAI_MODELS : DEFAULT_GEMINI_MODELS),
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
        availableModels: [finalModel],
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

  // Determine current dropdown model choices
  const currentModelChoices =
    activeProviderId === "openrouter"
      ? openRouterModels.length > 0
        ? openRouterModels
        : [
            { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", isFree: true },
            { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)", isFree: true },
            { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", isFree: true },
            { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash 001", isFree: false },
            { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", isFree: false },
          ]
      : activeProviderId === "openai"
      ? DEFAULT_OPENAI_MODELS.map((m) => ({ id: m, name: m }))
      : DEFAULT_GEMINI_MODELS.map((m) => ({ id: m, name: m }));

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* AI Provider Configuration (@openrouter/ai-sdk-provider) */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">AI Provider Engine & Model Config</h3>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> @openrouter/ai-sdk-provider
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Live models are automatically fetched from OpenRouter's REST API in the background.
          </p>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl space-y-5">
          {/* Dual Dropdown Selectors: Provider & Dynamic Model */}
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
                <option value="openrouter">OpenRouter (Auto-Synced Live Models — Free & Paid)</option>
                <option value="openai">OpenAI (Direct — GPT-4o, o3-mini)</option>
                <option value="gemini">Google Gemini (Direct — Gemini 1.5 Flash)</option>
              </select>
            </div>

            {/* Dynamic AI Model Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-primary" /> Live AI Model Dropdown Selector
                </Label>
                {isFetchingModels && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" /> Syncing live models...
                  </span>
                )}
              </div>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setCustomModelInput("");
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-semibold text-foreground"
              >
                {currentModelChoices.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.isFree ? `[FREE] ${m.name} (${m.id})` : `${m.name} (${m.id})`}
                  </option>
                ))}
                <option value="custom">+ Custom Model ID...</option>
              </select>
            </div>
          </div>

          {/* Optional Custom Model Input */}
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
