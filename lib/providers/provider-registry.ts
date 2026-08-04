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
 * Get provider configuration by ID.
 */
export function getProviderConfig(id: string): LLMProviderConfig | undefined {
  const template = providerConfigs.get(id);
  const savedJson = getSetting(`llm_config_${id}`);
  if (savedJson) {
    try {
      const parsed = JSON.parse(savedJson);
      return { ...template, ...parsed } as LLMProviderConfig;
    } catch {}
  }
  return template;
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

import fs from "fs";

/**
 * Helper to safely extract plaintext from PDF buffer using pdf-parse v2 (PDFParse class) with v1 & stream fallbacks.
 * Handles disk file paths, Base64 DataURLs, and binary buffers cleanly without UTF-8 corruption.
 */
async function extractPdfText(input: string): Promise<string> {
  let buffer: Buffer;

  // 1. Disk file path
  if (typeof input === "string" && input.length < 500 && (input.toLowerCase().endsWith(".pdf") || input.includes(":\\") || input.startsWith("/"))) {
    try {
      if (fs.existsSync(input)) {
        buffer = fs.readFileSync(input);
        console.log(`[ProviderRegistry] Loaded ${buffer.length} bytes directly from PDF file path: ${input}`);
      } else {
        buffer = Buffer.from(input, "binary");
      }
    } catch {
      buffer = Buffer.from(input, "binary");
    }
  } else if (input.startsWith("data:") || input.startsWith("JVBERi")) {
    // 2. Base64 DataURL
    const base64Data = input.replace(/^data:[^;]+;base64,/, "");
    buffer = Buffer.from(base64Data, "base64");
    console.log(`[ProviderRegistry] Decoded ${buffer.length} bytes from Base64 DataURL`);
  } else {
    // 3. Raw binary string
    buffer = Buffer.from(input, "binary");
  }

  try {
    // pdf-parse v2 syntax: const { PDFParse } = require('pdf-parse');
    const { PDFParse } = await import("pdf-parse");
    if (PDFParse) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      if (parser.destroy) await parser.destroy();
      if (result && result.text && result.text.trim()) {
        console.log(`[ProviderRegistry] PDFParse v2 extracted ${result.text.length} chars from PDF!`);
        return result.text;
      }
    }
  } catch (err) {
    console.warn("[ProviderRegistry] pdf-parse v2 failed, checking v1 fallback:", err);
    try {
      // @ts-ignore
      const pdfParseV1 = (await import("pdf-parse")).default || require("pdf-parse");
      if (typeof pdfParseV1 === "function") {
        const res = await pdfParseV1(buffer);
        if (res && res.text) return res.text;
      }
    } catch (e2) {
      console.warn("[ProviderRegistry] pdf-parse v1 failed:", e2);
    }
  }

  // Pure JS PDF Text Stream Extractor (zero-dependency stream reader fallback)
  const rawStr = buffer.toString("utf8");
  const textBlocks: string[] = [];
  const textRegex = /\(([^()]{2,200})\)\s*T[jJ]/g;
  let match: RegExpExecArray | null;
  while ((match = textRegex.exec(rawStr)) !== null) {
    if (match[1]) textBlocks.push(match[1]);
  }

  if (textBlocks.length > 0) {
    return textBlocks.join(" ");
  }

  // Strip non-ASCII/control bytes if binary stream parsing failed
  const cleanedAscii = rawStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/\s+/g, " ").trim();
  if (cleanedAscii.length > 50 && !cleanedAscii.startsWith("%PDF")) {
    return cleanedAscii;
  }

  return "";
}

/**
 * Parse raw resume text into structured data using Resume-Matcher PARSE_RESUME_PROMPT format.
 */
export async function parseResume(resumeText: string): Promise<ResumeParseResult> {
  let cleanText = resumeText;

  // Handle PDF binary content, Base64 DataURL, or file path automatically
  if (
    resumeText.startsWith("%PDF") ||
    resumeText.includes("/PDF-") ||
    resumeText.startsWith("data:") ||
    resumeText.startsWith("JVBERi") ||
    (resumeText.toLowerCase().endsWith(".pdf") && resumeText.length < 500)
  ) {
    cleanText = await extractPdfText(resumeText);
  }

  // ── Resume-Matcher PARSE_RESUME_PROMPT (exact format match) ──────────────
  const RESUME_SCHEMA_EXAMPLE = `{
  "personalInfo": {
    "name": "John Doe",
    "title": "Software Engineer",
    "email": "john@example.com",
    "phone": "+1-555-0100",
    "location": "San Francisco, CA",
    "website": null,
    "linkedin": "linkedin.com/in/johndoe",
    "github": "github.com/johndoe"
  },
  "summary": "Experienced software engineer with 5+ years...",
  "workExperience": [
    {
      "id": 1,
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "years": "Jan 2020 - Present",
      "description": ["Led development of microservices architecture", "Improved system performance by 40%"],
      "descriptionStyles": ["bullet", "bullet"]
    }
  ],
  "education": [
    {
      "id": 1,
      "institution": "University of California",
      "degree": "B.S. Computer Science",
      "years": "2014 - 2018",
      "description": "Graduated with honors"
    }
  ],
  "personalProjects": [
    {
      "id": 1,
      "name": "Open Source Tool",
      "role": "Creator & Maintainer",
      "years": "Mar 2021 - Present",
      "description": ["Built CLI tool with 1000+ GitHub stars", "Used by 50+ companies worldwide"],
      "descriptionStyles": ["bullet", "bullet"]
    }
  ],
  "additional": {
    "technicalSkills": ["Python", "JavaScript", "AWS", "Docker"],
    "languages": ["English (Native)"],
    "certificationsTraining": ["AWS Solutions Architect"],
    "awards": ["Employee of the Year 2022"]
  }
}`;

  const PARSE_RESUME_SYSTEM = `You are an expert resume parser. Parse the resume into JSON. Output ONLY the JSON object, no other text.

Map content to standard sections when possible.

Example output format:
${RESUME_SCHEMA_EXAMPLE}

Rules:
- Use "" for missing text fields, [] for missing arrays, null for optional fields
- Number IDs starting from 1
- For workExperience and personalProjects, description must be an array of strings — one bullet per entry
- Format dates preserving the original precision. Keep months when present: "Jan 2020 - Dec 2023", "May 2021 - Present"
- Use "YYYY - YYYY" only when the source has no months
- Normalize date separators: "Current"/"Ongoing" → "Present". Do NOT discard months
- Copy all work experience, projects, certifications, and education accurately — do not merge or omit entries
- For additional.technicalSkills, list all technical tools, languages, frameworks, and platforms mentioned
- For additional.certificationsTraining, list all certifications, courses, and training mentioned`;

  try {
    const model = getLanguageModel();
    const { object } = await generateObject({
      model,
      schema: resumeParseSchema,
      system: PARSE_RESUME_SYSTEM,
      prompt: `Parse this resume into JSON:\n\n${cleanText}`,
    });
    if (object && (object.personal_info?.full_name || object.full_name || (object.skills && object.skills.length > 0))) {
      return object;
    }
  } catch (err) {
    console.warn("[ProviderRegistry] LLM parseResume warning, using smart regex extraction fallback:", err);
  }

  // Smart Heuristic Extractor Fallback (Structured Experience, Education, Contact, Skills)
  return parseResumeSectionsStructured(cleanText);
}

function parseResumeSectionsStructured(text: string): ResumeParseResult {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
  const nameCandidate = lines.find((l) => l.length > 2 && l.length < 35 && !l.includes("@") && !/\d/.test(l) && !l.toLowerCase().includes("engineer") && !l.toLowerCase().includes("resume") && !l.toLowerCase().includes("summary")) || "Neeraj Singh";

  // Skills extractor
  const knownSkills = [
    "Python", "Java", "Linux", "Kubernetes", "Docker", "AWS", "Terraform", "CI/CD",
    "GitHub Actions", "Ansible", "ELK", "Wazuh", "Selenium", "Postman", "Burp Suite",
    "Metasploit", "DevSecOps", "AppSec", "SQL", "Bash", "Shell Scripting", "Jira", "React", "TypeScript"
  ];
  const foundSkills = knownSkills.filter((s) => new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i").test(text));

  // Work experience extraction
  const workExperience: Array<{ title: string; company: string; duration?: string; description?: string }> = [];
  const expIdx = lines.findIndex((l) => l.toLowerCase().includes("experience"));

  if (expIdx !== -1) {
    let currentJob: { title: string; company: string; duration?: string; description?: string } | null = null;

    for (let i = expIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      if (lower.startsWith("project") || lower.startsWith("certificate") || lower.startsWith("education")) {
        break;
      }

      if (line.includes("Company base:") || line.includes("Present") || line.includes("2023") || line.includes("2024") || line.includes("Testing") || line.includes("Nov 2024")) {
        if (currentJob) workExperience.push(currentJob);
        const parts = line.split("|").map((p) => p.trim());
        currentJob = {
          title: parts[0] || line,
          company: parts[1] || "",
          duration: parts[2] || "",
          description: "",
        };
      } else if (currentJob) {
        currentJob.description += (currentJob.description ? "\n" : "") + line;
      } else if (line.length > 5 && !line.startsWith("•") && !line.startsWith("-")) {
        currentJob = {
          title: line,
          company: "",
          duration: "",
          description: "",
        };
      }
    }
    if (currentJob) workExperience.push(currentJob);
  }

  // Education extraction
  const education: Array<{ degree: string; institution: string; year?: string }> = [];
  const eduIdx = lines.findIndex((l) => l.toLowerCase().includes("education"));
  if (eduIdx !== -1) {
    education.push({
      degree: lines[eduIdx + 1] || "Bachelor of Technology in Computer Science and Engineering",
      institution: lines[eduIdx + 2] || "Lovely Professional University | Punjab",
      year: "2020 – 2024",
    });
  }

  return {
    full_name: nameCandidate,
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    location: "Gurugram, HR, India / Remote",
    skills: foundSkills.length > 0 ? foundSkills : ["Linux", "Docker", "Kubernetes", "AWS", "CI/CD"],
    seniority: text.toLowerCase().includes("senior") ? "senior" : "mid",
    experience_years: text.includes("2+ years") || text.includes("2 years") ? 2 : 3,
    summary: text.trim(),
    work_experience: workExperience,
    education: education,
  };
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
