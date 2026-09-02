/**
 * Resume Tailoring Engine using Vercel AI SDK.
 *
 * Tailors candidate resume bullet points and summary for specific job postings
 * while preserving strict candidate honesty (anti-hallucination).
 */

import { tailorResume } from "@/lib/providers/provider-registry";
import { getProfileById, getJobPostingById, insertDocument } from "@/lib/db";
import type { TailoredResumeResult } from "./types";

export async function generateTailoredResume(
  profileId: string,
  jobId: string,
): Promise<{ result: TailoredResumeResult; documentId: string }> {
  const profile = getProfileById(profileId);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  const job = getJobPostingById(jobId);
  if (!job) {
    throw new Error(`Job posting not found: ${jobId}`);
  }

  const profileSummary = `Candidate: ${profile.name}. Skills: ${profile.skills}. Experience: ${profile.experience_years} years (${profile.seniority}). ${profile.summary || ""}`;
  const jobDescription = `Job Title: ${job.title} at ${job.company}.\nDescription:\n${job.description || ""}\nRequirements:\n${job.requirements || ""}`;

  const text = await tailorResume(profileSummary, jobDescription);

  let result: TailoredResumeResult;
  try {
    const parsed = JSON.parse(text);
    result = {
      tailoredSummary: parsed.tailoredSummary || parsed.summary || text,
      tailoredBullets: Array.isArray(parsed.tailoredBullets) ? parsed.tailoredBullets : [],
      matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : [],
    };
  } catch {
    result = {
      tailoredSummary: text,
      tailoredBullets: [],
      matchedKeywords: [],
    };
  }

  const tailoredContent = `
# ${profile.name} — Resume (Tailored for ${job.title} at ${job.company})

## Professional Summary
${result.tailoredSummary}

${result.matchedKeywords.length ? `## Key Targeted Skills & Keywords\n${result.matchedKeywords.map((k) => `- ${k}`).join("\n")}` : ""}

${result.tailoredBullets.length ? `## Professional Highlights\n${result.tailoredBullets.map((b) => `- ${b}`).join("\n")}` : ""}
  `.trim();

  // Save tailored document in SQLite `documents` table
  const doc = insertDocument({
    profile_id: profileId,
    name: `Tailored Resume — ${job.company} (${job.title})`,
    type: "resume",
    content_text: tailoredContent,
    is_primary: false,
  });

  return {
    result,
    documentId: doc.id,
  };
}
