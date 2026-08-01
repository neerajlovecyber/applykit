/**
 * modelFetcher.ts - Dynamic Provider Model Discovery
 *
 * Fetches available models from live AI provider APIs (OpenAI, Gemini, Anthropic/Claude, DeepSeek, Groq, OpenRouter).
 */

export interface ProviderModel {
  id: string;
  label: string;
  isFree?: boolean;
}

export type Provider = "openrouter" | "gemini" | "groq" | "openai" | "claude" | "deepseek";

/**
 * Fetch available models from a provider's API.
 * Returns a filtered, sorted array of { id, label } objects.
 */
export async function fetchProviderModels(
  provider: Provider,
  apiKey?: string
): Promise<ProviderModel[]> {
  switch (provider) {
    case "openrouter":
      return fetchOpenRouterModels();
    case "openai":
      return fetchOpenAIModels(apiKey);
    case "groq":
      return fetchGroqModels(apiKey);
    case "claude":
      return fetchAnthropicModels(apiKey);
    case "gemini":
      return fetchGeminiModels(apiKey);
    case "deepseek":
      return fetchDeepSeekModels(apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ─── OpenRouter ─────────────────────────────────────────────────────────────

export async function fetchOpenRouterModels(): Promise<ProviderModel[]> {
  const freeOption: ProviderModel = { id: "openrouter/free", label: "openrouter/free", isFree: true };
  const autoOption: ProviderModel = { id: "openrouter/auto", label: "openrouter/auto", isFree: true };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
      },
    });

    if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);

    const data = await res.json();
    const rawModels: any[] = data?.data || [];

    const parsedModels: ProviderModel[] = rawModels.map((m: any) => {
      const isFree =
        m.id.endsWith(":free") ||
        (m.pricing?.prompt === "0" && m.pricing?.completion === "0");

      return {
        id: m.id,
        label: m.name ? m.name : m.id,
        isFree,
      };
    });

    const sorted = parsedModels.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return a.label.localeCompare(b.label);
    });

    return [
      freeOption,
      autoOption,
      ...sorted.filter((m) => m.id !== "openrouter/free" && m.id !== "openrouter/auto"),
    ];
  } catch (err) {
    console.error("[ModelFetcher] OpenRouter fetch error:", err);
    return [freeOption, autoOption];
  }
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function fetchOpenAIModels(apiKey?: string): Promise<ProviderModel[]> {
  if (!apiKey) {
    return [
      { id: "gpt-4o", label: "gpt-4o" },
      { id: "gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "o3-mini", label: "o3-mini" },
      { id: "o1", label: "o1" },
    ];
  }

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);

    const data = await res.json();
    const models: any[] = data?.data || [];

    const filtered = models.filter((m: any) => {
      const id = (m.id || "").toLowerCase();
      if (id.includes("gpt-4o")) return true;
      if (/gpt-[4-9]/.test(id)) return true;
      if (/^o[134]/.test(id) && !id.includes("audio") && !id.includes("realtime")) return true;
      return false;
    });

    return filtered
      .map((m: any) => ({ id: m.id, label: m.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (err) {
    console.error("[ModelFetcher] OpenAI fetch error:", err);
    return [
      { id: "gpt-4o", label: "gpt-4o" },
      { id: "gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "o3-mini", label: "o3-mini" },
      { id: "o1", label: "o1" },
    ];
  }
}

// ─── Groq ────────────────────────────────────────────────────────────────────

async function fetchGroqModels(apiKey?: string): Promise<ProviderModel[]> {
  if (!apiKey) {
    return [
      { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile" },
      { id: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant" },
      { id: "mixtral-8x7b-32768", label: "mixtral-8x7b-32768" },
      { id: "deepseek-r1-distill-llama-70b", label: "deepseek-r1-distill-llama-70b" },
    ];
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);

    const data = await res.json();
    const models: any[] = data?.data || [];

    const excludePatterns = [
      "whisper", "distil", "guard", "tool-use",
      "vision-preview", "tts", "playai", "speech",
    ];

    const filtered = models.filter((m: any) => {
      const id = (m.id || "").toLowerCase();
      return !excludePatterns.some((p) => id.includes(p));
    });

    return filtered
      .map((m: any) => ({ id: m.id, label: m.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (err) {
    console.error("[ModelFetcher] Groq fetch error:", err);
    return [
      { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile" },
      { id: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant" },
    ];
  }
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function fetchAnthropicModels(apiKey?: string): Promise<ProviderModel[]> {
  if (!apiKey) {
    return [
      { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    ];
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);

    const data = await res.json();
    const models: any[] = data?.data || [];

    const filtered = models.filter((m: any) => {
      const id = (m.id || "").toLowerCase();
      if (!id.includes("claude")) return false;
      const versionMatch = id.match(/claude-(\d+)-(\d+)?/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1], 10);
        const minor = versionMatch[2] ? parseInt(versionMatch[2], 10) : 0;
        if (major > 3 || (major === 3 && minor >= 5)) return true;
      }
      return false;
    });

    return filtered
      .map((m: any) => ({ id: m.id, label: m.display_name || m.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (err) {
    console.error("[ModelFetcher] Anthropic fetch error:", err);
    return [
      { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    ];
  }
}

// ─── DeepSeek ────────────────────────────────────────────────────────────────

const DEEPSEEK_DEFAULT_MODELS: ProviderModel[] = [
  { id: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { id: "deepseek-v4-pro", label: "deepseek-v4-pro" },
  { id: "deepseek-coder", label: "deepseek-coder" },
];

async function fetchDeepSeekModels(apiKey?: string): Promise<ProviderModel[]> {
  if (!apiKey) return DEEPSEEK_DEFAULT_MODELS;

  try {
    const res = await fetch("https://api.deepseek.com/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Invalid or unauthorized DeepSeek API key");
      }
      return DEEPSEEK_DEFAULT_MODELS;
    }

    const data = await res.json();
    const models: any[] = data?.data || [];
    if (!Array.isArray(models) || models.length === 0) return DEEPSEEK_DEFAULT_MODELS;

    const excludePatterns = [
      "embedding", "embed", "vision", "image", "audio",
      "tts", "speech", "whisper", "stt",
    ];

    const filtered = models.filter((m: any) => {
      const id = (m.id || "").toLowerCase();
      if (!/^deepseek-v\d/.test(id)) return false;
      if (excludePatterns.some((p) => id.includes(p))) return false;
      return true;
    });

    if (filtered.length === 0) return DEEPSEEK_DEFAULT_MODELS;

    return filtered
      .map((m: any) => ({ id: m.id, label: m.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (err) {
    console.error("[ModelFetcher] DeepSeek fetch error:", err);
    return DEEPSEEK_DEFAULT_MODELS;
  }
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

async function fetchGeminiModels(apiKey?: string): Promise<ProviderModel[]> {
  if (!apiKey) {
    return [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ];
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

    const data = await res.json();
    const models: any[] = data?.models || [];

    const excludePatterns = ["nano", "custom", "computer-use", "banana", "tts", "embedding", "aqa", "vision"];

    const filtered = models.filter((m: any) => {
      const name = (m.name || "").toLowerCase();
      const displayName = (m.displayName || "").toLowerCase();
      const combined = name + " " + displayName;

      const supportsChat = m.supportedGenerationMethods?.includes("generateContent");
      if (!supportsChat) return false;

      if (excludePatterns.some((p) => combined.includes(p))) return false;

      return /gemini-([2-9]|1\.5)/.test(combined);
    });

    return filtered
      .map((m: any) => {
        const id = (m.name || "").replace(/^models\//, "");
        return { id, label: m.displayName || id };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (err) {
    console.error("[ModelFetcher] Gemini fetch error:", err);
    return [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ];
  }
}
