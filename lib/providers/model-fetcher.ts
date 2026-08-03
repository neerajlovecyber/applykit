/**
 * modelFetcher.ts - 100% Pure Dynamic Provider Model Discovery
 *
 * Discovers models strictly from live REST APIs (OpenRouter public API, OpenAI, Gemini, Anthropic, DeepSeek, Groq).
 * Zero hardcoded lists.
 */

export interface ProviderModel {
  id: string;
  label: string;
  isFree?: boolean;
}

export type Provider = "openrouter" | "gemini" | "groq" | "openai" | "claude" | "deepseek";

/**
 * Fetch available models dynamically from provider's live API or OpenRouter catalog.
 */
export async function fetchProviderModels(
  provider: Provider,
  apiKey?: string
): Promise<ProviderModel[]> {
  console.log(`[IPC model-fetcher] Fetching live models for provider="${provider}"`);

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
      return fetchOpenRouterModels();
  }
}

// ─── OpenRouter ───────────────────────────────────────────────────────────────

export async function fetchOpenRouterModels(): Promise<ProviderModel[]> {
  const freeOption: ProviderModel = { id: "openrouter/free", label: "openrouter/free", isFree: true };
  const autoOption: ProviderModel = { id: "openrouter/auto", label: "openrouter/auto", isFree: true };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);

    const data = await res.json();
    const rawModels: any[] = data?.data || [];

    const parsedModels: ProviderModel[] = rawModels.map((m: any) => {
      const isFree =
        m.id?.endsWith(":free") ||
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
  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (res.ok) {
        const data = await res.json();
        const models: any[] = data?.data || [];
        const filtered = models.filter((m: any) => {
          const id = (m.id || "").toLowerCase();
          return id.includes("gpt") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("o4");
        });

        if (filtered.length > 0) {
          return filtered
            .map((m: any) => ({ id: m.id, label: m.id }))
            .sort((a, b) => a.label.localeCompare(b.label));
        }
      }
    } catch (err) {
      console.error("[ModelFetcher] OpenAI live fetch error:", err);
    }
  }

  return fetchOpenRouterModelsByPrefix("openai/", [], true);
}

// ─── Groq ────────────────────────────────────────────────────────────────────

async function fetchGroqModels(apiKey?: string): Promise<ProviderModel[]> {
  if (apiKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (res.ok) {
        const data = await res.json();
        const models: any[] = data?.data || [];
        const excludePatterns = ["whisper", "distil", "guard", "tool-use", "vision", "tts", "speech"];
        const filtered = models.filter((m: any) => {
          const id = (m.id || "").toLowerCase();
          return !excludePatterns.some((p) => id.includes(p));
        });

        if (filtered.length > 0) {
          return filtered
            .map((m: any) => ({ id: m.id, label: m.id }))
            .sort((a, b) => a.label.localeCompare(b.label));
        }
      }
    } catch (err) {
      console.error("[ModelFetcher] Groq live fetch error:", err);
    }
  }

  return fetchOpenRouterModelsByPrefix("groq/", ["meta-llama/", "mistralai/"]);
}

// ─── Anthropic Claude ────────────────────────────────────────────────────────

async function fetchAnthropicModels(apiKey?: string): Promise<ProviderModel[]> {
  if (apiKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const models: any[] = data?.data || [];
        const filtered = models.filter((m: any) => (m.id || "").toLowerCase().includes("claude"));

        if (filtered.length > 0) {
          return filtered
            .map((m: any) => ({ id: m.id, label: m.display_name || m.id }))
            .sort((a, b) => a.label.localeCompare(b.label));
        }
      }
    } catch (err) {
      console.error("[ModelFetcher] Anthropic live fetch error:", err);
    }
  }

  return fetchOpenRouterModelsByPrefix("anthropic/");
}

// ─── DeepSeek ────────────────────────────────────────────────────────────────

async function fetchDeepSeekModels(apiKey?: string): Promise<ProviderModel[]> {
  if (apiKey) {
    try {
      const res = await fetch("https://api.deepseek.com/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (res.ok) {
        const data = await res.json();
        const models: any[] = data?.data || [];
        const excludePatterns = ["embedding", "embed", "vision", "audio", "tts"];
        const filtered = models.filter((m: any) => {
          const id = (m.id || "").toLowerCase();
          return !excludePatterns.some((p) => id.includes(p));
        });

        if (filtered.length > 0) {
          return filtered
            .map((m: any) => ({ id: m.id, label: m.id }))
            .sort((a, b) => a.label.localeCompare(b.label));
        }
      }
    } catch (err) {
      console.error("[ModelFetcher] DeepSeek live fetch error:", err);
    }
  }

  return fetchOpenRouterModelsByPrefix("deepseek/");
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

async function fetchGeminiModels(apiKey?: string): Promise<ProviderModel[]> {
  if (apiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
      );

      if (res.ok) {
        const data = await res.json();
        const models: any[] = data?.models || [];
        const excludePatterns = ["nano", "custom", "computer-use", "tts", "embedding", "aqa", "vision"];
        const filtered = models.filter((m: any) => {
          const name = (m.name || "").toLowerCase();
          const displayName = (m.displayName || "").toLowerCase();
          const combined = name + " " + displayName;
          const supportsChat = m.supportedGenerationMethods?.includes("generateContent");
          return supportsChat && !excludePatterns.some((p) => combined.includes(p));
        });

        if (filtered.length > 0) {
          return filtered
            .map((m: any) => {
              const id = (m.name || "").replace(/^models\//, "");
              return { id, label: m.displayName || id };
            })
            .sort((a, b) => a.label.localeCompare(b.label));
        }
      }
    } catch (err) {
      console.error("[ModelFetcher] Gemini live fetch error:", err);
    }
  }

  return fetchOpenRouterModelsByPrefix("google/", [], true);
}

// ─── Helper: Live Filter via OpenRouter Catalog ────────────────────────────

async function fetchOpenRouterModelsByPrefix(
  primaryPrefix: string,
  extraPrefixes: string[] = [],
  stripPrefix: boolean = false
): Promise<ProviderModel[]> {
  const allOpenRouterModels = await fetchOpenRouterModels();
  const prefixes = [primaryPrefix, ...extraPrefixes];

  const matched = allOpenRouterModels.filter((m) => {
    if (m.id === "openrouter/free" || m.id === "openrouter/auto") return false;
    const lowerId = m.id.toLowerCase();
    return prefixes.some((prefix) => lowerId.startsWith(prefix.toLowerCase()));
  });

  const result: ProviderModel[] = matched.map((m) => {
    const rawId = m.id;
    let cleanId = rawId;
    let cleanLabel = m.label || rawId;
    for (const prefix of prefixes) {
      if (cleanLabel.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleanLabel = cleanLabel.slice(prefix.length);
        if (stripPrefix) {
          cleanId = cleanId.slice(prefix.length);
        }
        break;
      }
    }
    return {
      id: cleanId,
      label: cleanLabel || cleanId,
      isFree: m.isFree,
    };
  });

  return result;
}
