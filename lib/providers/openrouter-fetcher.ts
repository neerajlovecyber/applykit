/**
 * OpenRouter Dynamic Model Discovery.
 *
 * Fetches models strictly from OpenRouter's live REST API.
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  isFree?: boolean;
}

/**
 * Fetch live available models directly from OpenRouter API.
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const freeOption: OpenRouterModel = {
    id: "openrouter/free",
    name: "openrouter/free",
    isFree: true,
  };

  const autoOption: OpenRouterModel = {
    id: "openrouter/auto",
    name: "openrouter/auto",
    isFree: true,
  };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const data = await res.json();
    const rawModels = data?.data || [];

    const parsedModels: OpenRouterModel[] = rawModels.map((m: any) => {
      const isFree =
        m.id.endsWith(":free") ||
        (m.pricing?.prompt === "0" && m.pricing?.completion === "0");

      return {
        id: m.id,
        name: m.name ? m.name : m.id,
        isFree,
      };
    });

    // Sort free models first
    const sorted = parsedModels.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return a.id.localeCompare(b.id);
    });

    return [
      freeOption,
      autoOption,
      ...sorted.filter((m) => m.id !== "openrouter/free" && m.id !== "openrouter/auto"),
    ];
  } catch (err) {
    console.error("[OpenRouterFetcher] Live API fetch error:", err);
    return [freeOption, autoOption];
  }
}
