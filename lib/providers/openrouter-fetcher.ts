/**
 * OpenRouter Dynamic Model Discovery Utility.
 *
 * Fetches the live catalog of models directly from OpenRouter's public REST API.
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  isFree?: boolean;
}

/**
 * Fetch live available models directly from OpenRouter public API endpoint.
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
    const sorted = parsedModels.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return a.id.localeCompare(b.id);
    });

    // Return live list with openrouter/auto as #1 choice
    return [
      { id: "openrouter/auto", name: "Auto Mode (Auto Selects Best Free Model)", isFree: true },
      ...sorted.filter((m) => m.id !== "openrouter/auto"),
    ];
  } catch (err) {
    console.error("[OpenRouterFetcher] Error fetching live OpenRouter models:", err);
    // Minimal dynamic fallback with Auto Mode
    return [
      { id: "openrouter/auto", name: "Auto Mode (Auto Selects Best Free Model)", isFree: true },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", isFree: true },
      { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Exp (Free)", isFree: true },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", isFree: true },
    ];
  }
}
