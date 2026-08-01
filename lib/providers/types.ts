/**
 * LLM provider type definitions and schemas using Vercel AI SDK.
 *
 * Supports OpenAI, Google Gemini, Ollama, OpenRouter, and custom OpenAI-compatible endpoints.
 */

import { z } from "zod";

export interface LLMProviderConfig {
  id: string;
  name: string;
  type: "openai" | "gemini" | "ollama" | "openrouter" | "custom";
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  availableModels: string[];
  isEnabled: boolean;
  rateLimit?: number;
}

export const PROVIDER_TEMPLATES: Record<string, Omit<LLMProviderConfig, "apiKey" | "isEnabled">> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    availableModels: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "o3-mini"],
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    type: "gemini",
    defaultModel: "gemini-2.0-flash",
    availableModels: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    type: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.0-flash-001",
    availableModels: [
      "google/gemini-2.0-flash-001",
      "deepseek/deepseek-r1",
      "anthropic/claude-3.5-sonnet",
      "meta-llama/llama-3.3-70b-instruct",
      "openai/gpt-4o-mini",
      "qwen/qwen-2.5-72b-instruct",
    ],
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    type: "ollama",
    baseUrl: "http://localhost:11434/api",
    defaultModel: "llama3.2",
    availableModels: ["llama3.2", "mistral", "qwen2.5"],
  },
  custom: {
    id: "custom",
    name: "Custom OpenAI-Compatible",
    type: "custom",
    baseUrl: "http://localhost:8000/v1",
    defaultModel: "default",
    availableModels: ["default"],
  },
};

/**
 * Zod Schemas for structured output via generateObject()
 */
export const jobScoringSchema = z.object({
  score: z.number().min(0).max(1).describe("Overall match fit score between 0.0 and 1.0"),
  breakdown: z.object({
    skills: z.number().min(0).max(1),
    experience: z.number().min(0).max(1),
    seniority: z.number().min(0).max(1),
    location: z.number().min(0).max(1),
    industry: z.number().min(0).max(1),
  }),
  explanation: z.string().describe("Human-readable justification for the fit score"),
});

export type JobScoringResult = z.infer<typeof jobScoringSchema>;

export const resumeParseSchema = z.object({
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  portfolio_url: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  skills: z.array(z.string()).default([]),
  experience_years: z.number().nullable().optional(),
  seniority: z.string().default("mid"),
  work_experience: z
    .array(
      z.object({
        title: z.string(),
        company: z.string(),
        duration: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .default([]),
  education: z
    .array(
      z.object({
        degree: z.string(),
        institution: z.string(),
        year: z.string().optional(),
      })
    )
    .default([]),
});

export type ResumeParseResult = z.infer<typeof resumeParseSchema>;

/**
 * System Prompts
 */
export const SYSTEM_PROMPTS = {
  resumeTailor: `You are an expert resume writer. Given a candidate's profile and a job description, 
rewrite the resume bullet points to emphasize relevant skills and experience for this specific role. 
Keep the content truthful and based only on the candidate's actual experience. 
Output clean text suitable for a resume - no markdown header tags, no emojis, no filler phrases.`,

  coverLetter: `You are a professional cover letter writer. Given a candidate's profile and a job posting, 
write a compelling cover letter that:
1. Opens with a specific connection to the company or role
2. Highlights 2-3 most relevant experiences from the candidate's background
3. Demonstrates understanding of what the role requires
4. Closes with enthusiasm without being generic
Keep it concise (250-350 words). Use a professional but human tone. 
Avoid AI cliches like "I am thrilled", "proven track record", or "leverage".`,

  questionAnswer: `You are helping a job applicant answer application form questions.
Given the candidate's profile and the question, provide a concise, honest answer.
Base your answer only on the candidate's actual profile data.
If you don't have enough information, indicate what's missing.
Keep answers concise and direct - no filler, no marketing speak.`,

  jobScoring: `You are an expert recruiter assessing job-candidate fit.
Given a candidate's profile and a job posting, evaluate fit and provide a score between 0.0 and 1.0 along with breakdown and explanation.`,

  resumeParse: `You are a resume parser. Extract structured data from the provided resume text accurately.`,
} as const;
