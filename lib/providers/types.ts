/**
 * LLM provider type definitions and schemas using Vercel AI SDK.
 *
 * Supports OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Groq, OpenRouter, and custom endpoints.
 */

import { z } from "zod";

export interface LLMProviderConfig {
  id: string;
  name: string;
  type: "openai" | "gemini" | "openrouter" | "claude" | "deepseek" | "groq" | "custom";
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  availableModels: string[];
  isEnabled: boolean;
  rateLimit?: number;
}

export const PROVIDER_TEMPLATES: Record<string, Omit<LLMProviderConfig, "apiKey" | "isEnabled">> = {
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    type: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/free",
    availableModels: [],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    availableModels: ["gpt-4o-mini", "gpt-4o", "o3-mini"],
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    type: "gemini",
    defaultModel: "gemini-1.5-flash",
    availableModels: ["gemini-1.5-flash", "gemini-1.5-pro"],
  },
  claude: {
    id: "claude",
    name: "Anthropic Claude",
    type: "claude",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-7-sonnet-20250219",
    availableModels: [],
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    type: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-v4-flash",
    availableModels: [],
  },
  groq: {
    id: "groq",
    name: "Groq",
    type: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    availableModels: [],
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
  personal_info: z
    .object({
      full_name: z.string().default(""),
      title: z.string().default(""),
      email: z.string().default(""),
      phone: z.string().default(""),
      location: z.string().default(""),
      linkedin_url: z.string().nullable().optional(),
      github_url: z.string().nullable().optional(),
      website_url: z.string().nullable().optional(),
    })
    .default({
      full_name: "",
      title: "",
      email: "",
      phone: "",
      location: "",
    })
    .optional(),
  // Top-level flat fields (old format fallback)
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  experience_years: z.number().default(3),
  seniority: z.string().default("mid"),
  work_experience: z.array(z.object({
    id: z.string().optional(),
    title: z.string().default(""),
    company: z.string().default(""),
    location: z.string().nullable().optional(),
    duration: z.string().optional(),
    years: z.string().optional(),
    description: z.union([z.string(), z.array(z.string())]).optional(),
  })).default([]),
  projects: z.array(z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    role: z.string().nullable().optional(),
    years: z.string().nullable().optional(),
    github: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    description: z.union([z.string(), z.array(z.string())]).optional(),
  })).default([]),
  certifications: z.array(z.object({
    id: z.string().optional(),
    title: z.string().default(""),
    issuer: z.string().default(""),
    year: z.string().nullable().optional(),
  })).default([]),
  education: z.array(z.object({
    id: z.string().optional(),
    degree: z.string().default(""),
    institution: z.string().default(""),
    years: z.string().optional(),
    year: z.string().optional(),
    description: z.string().nullable().optional(),
  })).default([]),
  additional: z.object({
    technicalSkills: z.array(z.string()).default([]),
    certificationsTraining: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    awards: z.array(z.string()).default([]),
  }).default({ technicalSkills: [], certificationsTraining: [], languages: [], awards: [] }).optional(),
  // Resume-Matcher camelCase output fields (primary LLM output format)
  personalInfo: z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().nullable().optional(),
    github: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
  }).optional(),
  workExperience: z.array(z.object({
    id: z.number().optional(),
    title: z.string().default(""),
    company: z.string().default(""),
    location: z.string().nullable().optional(),
    years: z.string().optional(),
    description: z.union([z.string(), z.array(z.string())]).optional(),
    descriptionStyles: z.array(z.string()).optional(),
  })).optional(),
  personalProjects: z.array(z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    role: z.string().nullable().optional(),
    years: z.string().nullable().optional(),
    description: z.union([z.string(), z.array(z.string())]).optional(),
    descriptionStyles: z.array(z.string()).optional(),
  })).optional(),
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
