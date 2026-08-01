/**
 * Gemini provider implementation using Vercel AI SDK.
 */

import { getLanguageModel } from "./provider-registry";
import type { LLMProviderConfig } from "./types";

export function getGeminiModel(apiKey?: string, modelName?: string) {
  const config: LLMProviderConfig = {
    id: "gemini",
    name: "Google Gemini",
    type: "gemini",
    apiKey,
    defaultModel: modelName || "gemini-2.0-flash",
    availableModels: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
    isEnabled: true,
  };

  return getLanguageModel(config, modelName);
}
