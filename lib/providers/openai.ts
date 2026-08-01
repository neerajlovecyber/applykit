/**
 * OpenAI provider implementation using Vercel AI SDK.
 */

import { getLanguageModel } from "./provider-registry";
import type { LLMProviderConfig } from "./types";

export function getOpenAIModel(apiKey?: string, modelName?: string) {
  const config: LLMProviderConfig = {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    apiKey,
    defaultModel: modelName || "gpt-4o-mini",
    availableModels: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "o3-mini"],
    isEnabled: true,
  };

  return getLanguageModel(config, modelName);
}
