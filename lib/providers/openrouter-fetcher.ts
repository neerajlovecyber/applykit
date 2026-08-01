/**
 * OpenRouter Dynamic Model Discovery Utility.
 *
 * Fetches live available models directly from OpenRouter's public REST API.
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  isFree?: boolean;
}

export const FALLBACK_OPENROUTER_MODELS: OpenRouterModel[] = [
  // Free Models
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", isFree: true },
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Exp (Free)", isFree: true },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", isFree: true },
  { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (Free)", isFree: true },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)", isFree: true },
  { id: "deepseek/deepseek-chat:free", name: "DeepSeek V3 (Free)", isFree: true },
  { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B (Free)", isFree: true },
  { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (Free)", isFree: true },
  { id: "microsoft/phi-3-mini-128k-instruct:free", name: "Phi 3 Mini (Free)", isFree: true },
  
  // High-Performance & Popular Models
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash 001", isFree: false },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", isFree: false },
  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", isFree: false },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", isFree: false },
  { id: "openai/gpt-4o", name: "GPT-4o", isFree: false },
  { id: "openai/o3-mini", name: "o3-mini", isFree: false },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", isFree: false },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3", isFree: false },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", isFree: false },
  { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B", isFree: false },
  { id: "mistralai/mistral-large-2411", name: "Mistral Large 2411", isFree: false },
  { id: "cohere/command-r-plus", name: "Command R+", isFree: false },
];

/**
 * Fetch live available models from OpenRouter public API endpoint.
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API status: ${res.status}`);
    }

    const data = await res.json();
    const rawModels = data?.data || [];

    if (rawModels.length === 0) {
      return FALLBACK_OPENROUTER_MODELS;
    }

    const parsedModels: OpenRouterModel[] = rawModels.map((m: any) => {
      const isFree =
        m.id.endsWith(":free") ||
        (m.pricing?.prompt === "0" && m.pricing?.completion === "0");

      return {
        id: m.id,
        name: m.name || m.id,
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
    console.error("[OpenRouterFetcher] Failed to fetch live model list, using rich fallback:", err);
    return FALLBACK_OPENROUTER_MODELS;
  }
}
