import React, { useState, useEffect, useRef } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";
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
} from "lucide-react";
import type { Platform } from "@/lib/main/db-queries";
import type { LLMProviderConfig } from "@/lib/providers/types";

interface ProviderModelItem {
  id: string;
  label: string;
  isFree?: boolean;
}

export const SettingsPage: React.FC = () => {
  const conveyor = useConveyor();

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [providers, setProviders] = useState<LLMProviderConfig[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>("openrouter");
  const [selectedProviderConfig, setSelectedProviderConfig] = useState<Partial<LLMProviderConfig>>({});

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("openrouter/free");
  const [customModelInput, setCustomModelInput] = useState("");

  const [dynamicModels, setDynamicModels] = useState<ProviderModelItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const currentProviderRef = useRef<string>("openrouter");

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
      currentProviderRef.current = activeId;

      const providerList: LLMProviderConfig[] = await (window as any).electron?.ipcRenderer?.invoke("llm:list-providers") || [
        { id: "openrouter", name: "OpenRouter", type: "openrouter", defaultModel: "openrouter/free", availableModels: [], isEnabled: true },
        { id: "openai", name: "OpenAI", type: "openai", defaultModel: "gpt-4o-mini", availableModels: [], isEnabled: true },
        { id: "gemini", name: "Google Gemini", type: "gemini", defaultModel: "gemini-1.5-flash", availableModels: [], isEnabled: true },
        { id: "claude", name: "Anthropic Claude", type: "claude", defaultModel: "claude-3-7-sonnet-20250219", availableModels: [], isEnabled: true },
        { id: "deepseek", name: "DeepSeek", type: "deepseek", defaultModel: "deepseek-v4-flash", availableModels: [], isEnabled: true },
        { id: "groq", name: "Groq", type: "groq", defaultModel: "llama-3.3-70b-versatile", availableModels: [], isEnabled: true },
      ];

      setProviders(providerList.filter((p) => p.id !== "ollama"));

      const activeConfig = providerList.find((p) => p.id === activeId) || providerList[0];
      if (activeConfig) {
        setSelectedProviderConfig(activeConfig);
        setSelectedModel(activeConfig.defaultModel || "");
        setBaseUrlInput(activeConfig.baseUrl || "");
      }

      loadLiveModels(activeId, activeConfig?.apiKey);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const loadLiveModels = async (provider: string, apiKey?: string) => {
    currentProviderRef.current = provider;
    setIsLoadingModels(true);
    try {
      const models: ProviderModelItem[] = await (window as any).electron?.ipcRenderer?.invoke("llm:fetch-provider-models", {
        provider,
        apiKey,
      });

      if (currentProviderRef.current === provider && models && models.length > 0) {
        setDynamicModels(models);
        if (!models.some((m) => m.id === selectedModel)) {
          setSelectedModel(models[0].id);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch live models for ${provider}:`, err);
    } finally {
      if (currentProviderRef.current === provider) {
        setIsLoadingModels(false);
      }
    }
  };

  const handleSelectProvider = (id: string) => {
    setActiveProviderId(id);
    currentProviderRef.current = id;
    setCustomModelInput("");

    const p = providers.find((pr) => pr.id === id);
    if (p) {
      setSelectedProviderConfig(p);
      setBaseUrlInput(p.baseUrl || "");
      setApiKeyInput("");
      setTestStatus({ testing: false });
    }

    loadLiveModels(id, "");
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
        availableModels: dynamicModels.map((m) => m.id),
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
                <option value="claude">Anthropic Claude</option>
                <option value="deepseek">DeepSeek</option>
                <option value="groq">Groq</option>
              </select>
            </div>

            {/* Model Searchable Combobox */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Model</Label>
                {isLoadingModels && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              </div>
              <ModelCombobox
                options={dynamicModels}
                value={selectedModel}
                onChange={(val) => {
                  setSelectedModel(val);
                  setCustomModelInput("");
                }}
                disabled={isLoadingModels}
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
              <Label className="text-xs font-medium">API Key</Label>
              <div className="relative">
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    if (e.target.value.length > 8) {
                      loadLiveModels(activeProviderId, e.target.value);
                    }
                  }}
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
