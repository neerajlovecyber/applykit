/**
 * OpenRouter Dynamic Model Discovery Utility.
 *
 * Fetches live available models directly from OpenRouter's public REST API.
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  isFree?: boolean;
}

/**
 * Fetch live available models from OpenRouter public API endpoint.
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "HTTP-Referer": "https://applykit.local",
        "X-Title": "ApplyKit Desktop App",
      },
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API status: ${res.status}`);
    }

    const data = await res.json();
    const rawModels = data?.data || [];

    const parsedModels: OpenRouterModel[] = rawModels.map((m: any) => {
      const isFree =
        m.id.endsWith(":free") ||
        (m.pricing?.prompt === "0" && m.pricing?.completion === "0");

      return {
        id: m.id,
        name: m.name || m.id,
        pricing: m.pricing,
        context_length: m.context_length,
        isFree,
      };
    });

    // Sort free models first, then alphabetically
    return parsedModels.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return a.id.localeCompare(b.id);
    });
  } catch (err) {
    console.error("[OpenRouterFetcher] Failed to fetch live model list:", err);
    // Fallback static list if network fetch fails
    return [
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", isFree: true },
      { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)", isFree: true },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", isFree: true },
      { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (Free)", isFree: true },
      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)", isFree: true },
      { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash 001", isFree: false },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", isFree: false },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", isFree: false },
    ];
  }
}
