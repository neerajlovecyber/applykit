/**
 * Provider Registry using Vercel AI SDK and @openrouter/ai-sdk-provider.
 *
 * Provides model instantiation and high-level AI tasks (scoring, drafting, parsing, Q&A)
 * powered by `generateText` and `generateObject` from the `ai` SDK.
 */

import { generateText, generateObject, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  LLMProviderConfig,
  PROVIDER_TEMPLATES,
  SYSTEM_PROMPTS,
  jobScoringSchema,
  JobScoringResult,
  resumeParseSchema,
  ResumeParseResult,
} from "./types";
import { getSetting, setSetting } from "@/lib/main/db-queries";

const providerConfigs = new Map<string, LLMProviderConfig>();
let activeProviderId: string | null = null;

// Initialize default templates in memory
for (const [id, template] of Object.entries(PROVIDER_TEMPLATES)) {
  providerConfigs.set(id, {
    ...template,
    isEnabled: id === "openai" || id === "gemini" || id === "openrouter",
  });
}

/**
 * Register or update a provider configuration.
 */
export function configureProvider(config: LLMProviderConfig): void {
  providerConfigs.set(config.id, config);
  setSetting(`llm_config_${config.id}`, JSON.stringify(config));
  console.log(`[LLM] Configured provider: ${config.name} (${config.id})`);
}

/**
 * Set active provider ID.
 */
export function setActiveProvider(id: string): void {
  if (!providerConfigs.has(id)) {
    throw new Error(`Unknown provider: ${id}`);
  }
  activeProviderId = id;
  setSetting("llm_active_provider", id);
}

/**
 * Get active provider configuration.
 */
export function getActiveProviderConfig(): LLMProviderConfig {
  if (!activeProviderId) {
    const saved = getSetting("llm_active_provider");
    if (saved && providerConfigs.has(saved)) {
      activeProviderId = saved;
    }
  }

  if (activeProviderId) {
    const savedJson = getSetting(`llm_config_${activeProviderId}`);
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson);
        providerConfigs.set(activeProviderId, parsed);
      } catch {
        // use default
      }
    }
    const cfg = providerConfigs.get(activeProviderId);
    if (cfg) return cfg;
  }

  const fallback = providerConfigs.get("openrouter") || providerConfigs.get("openai")!;
  return fallback;
}

/**
 * Get all registered provider configurations.
 */
export function listProviders(): LLMProviderConfig[] {
  const result: LLMProviderConfig[] = [];
  for (const [id, template] of providerConfigs.entries()) {
    if (id === "ollama") continue; // Exclude Ollama per user request
    const savedJson = getSetting(`llm_config_${id}`);
    let config = { ...template };
    if (savedJson) {
      try {
        config = { ...config, ...JSON.parse(savedJson) };
      } catch {
        // fallback to in-memory
      }
    }
    result.push({
      ...config,
      apiKey: config.apiKey ? "••••••" + config.apiKey.slice(-4) : undefined,
    });
  }
  return result;
}

/**
 * Create a Vercel AI SDK LanguageModel instance based on current provider config.
 */
export function getLanguageModel(overrideConfig?: LLMProviderConfig, modelName?: string): LanguageModel {
  const config = overrideConfig || getActiveProviderConfig();
  const targetModel = modelName || config.defaultModel;

  switch (config.type) {
    case "openrouter": {
      const openrouter = createOpenRouter({
        apiKey: config.apiKey || process.env.OPENROUTER_API_KEY || "",
      });
      return openrouter(targetModel);
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY || "",
        baseURL: config.baseUrl || "https://api.openai.com/v1",
      });
      return openai(targetModel);
    }
    case "gemini": {
      const google = createGoogleGenerativeAI({
        apiKey: config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
      });
      return google(targetModel);
    }
    case "claude": {
      const claudeOpenAI = createOpenAI({
        name: "claude",
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || "",
        baseURL: config.baseUrl || "https://api.anthropic.com/v1",
      });
      return claudeOpenAI(targetModel);
    }
    case "deepseek": {
      const deepseekOpenAI = createOpenAI({
        name: "deepseek",
        apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY || "",
        baseURL: config.baseUrl || "https://api.deepseek.com/v1",
      });
      return deepseekOpenAI(targetModel);
    }
    case "groq": {
      const groqOpenAI = createOpenAI({
        name: "groq",
        apiKey: config.apiKey || process.env.GROQ_API_KEY || "",
        baseURL: config.baseUrl || "https://api.groq.com/openai/v1",
      });
      return groqOpenAI(targetModel);
    }
    case "custom": {
      const customOpenAI = createOpenAI({
        name: "custom",
        apiKey: config.apiKey || "dummy",
        baseURL: config.baseUrl || "http://localhost:8000/v1",
      });
      return customOpenAI(targetModel);
    }
    default:
      throw new Error(`Unsupported provider type: ${(config as LLMProviderConfig).type}`);
  }
}

/**
 * Test provider connection by generating a simple text response.
 */
export async function testProviderConnection(config: LLMProviderConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const model = getLanguageModel(config);
    const { text } = await generateText({
      model,
      prompt: "Reply with 'OK'",
      maxTokens: 5,
    });
    if (text) return { success: true };
    return { success: false, error: "Empty response from provider" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Score a job posting against a candidate profile using generateObject.
 */
export async function scoreJobFit(
  profileSummary: string,
  jobDescription: string
): Promise<JobScoringResult> {
  const model = getLanguageModel();
  const { object } = await generateObject({
    model,
    schema: jobScoringSchema,
    system: SYSTEM_PROMPTS.jobScoring,
    prompt: `## Candidate Profile\n${profileSummary}\n\n## Job Posting\n${jobDescription}`,
  });

  return object;
}

/**
 * Generate a tailored cover letter using generateText.
 */
export async function generateCoverLetter(
  profileSummary: string,
  jobDescription: string
): Promise<string> {
  const model = getLanguageModel();
  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPTS.coverLetter,
    prompt: `## Candidate Profile\n${profileSummary}\n\n## Job Posting\n${jobDescription}`,
  });

  return text;
}

/**
 * Answer an application form question using generateText.
 */
export async function answerQuestion(
  profileSummary: string,
  question: string,
  context?: string
): Promise<string> {
  const model = getLanguageModel();
  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPTS.questionAnswer,
    prompt: `## Candidate Profile\n${profileSummary}\n\n${context ? `## Job Context\n${context}\n\n` : ""}## Question\n${question}`,
  });

  return text;
}

/**
 * Parse raw resume text into structured data using generateObject.
 */
export async function parseResume(resumeText: string): Promise<ResumeParseResult> {
  const model = getLanguageModel();
  const { object } = await generateObject({
    model,
    schema: resumeParseSchema,
    system: SYSTEM_PROMPTS.resumeParse,
    prompt: resumeText,
  });

  return object;
}

/**
 * Tailor resume bullet points for a target job.
 */
export async function tailorResume(
  profileSummary: string,
  jobDescription: string
): Promise<string> {
  const model = getLanguageModel();
  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPTS.resumeTailor,
    prompt: `## Current Resume/Profile\n${profileSummary}\n\n## Target Job\n${jobDescription}\n\nRewrite the experience section to emphasize relevant skills for this role.`,
  });

  return text;
}
