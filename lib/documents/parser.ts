/**
 * Resume Parser Engine using Vercel AI SDK.
 *
 * Converts raw resume text / uploaded documents into structured candidate profiles.
 */

import { parseResume } from "@/lib/providers/provider-registry";
import { upsertProfile, getProfileById } from "@/lib/main/db-queries";
import type { ResumeParseResult } from "./types";

/**
 * Parse raw resume text into structured fields using Vercel AI SDK.
 */
export async function parseResumeText(rawText: string): Promise<ResumeParseResult> {
  const result = await parseResume(rawText);
  return {
    name: result.name || "Candidate",
    email: result.email || "",
    phone: result.phone || "",
    location: result.location || "",
    skills: result.skills || [],
    seniority: result.seniority || "Mid",
    experienceYears: result.experienceYears || 3,
    summary: result.summary || "",
    workExperience: result.workExperience || [],
  };
}

/**
 * Parse resume text and automatically update or create SQLite Profile.
 */
export async function syncResumeToProfile(profileId: string, rawText: string): Promise<void> {
  const parsed = await parseResumeText(rawText);
  const existing = getProfileById(profileId);

  upsertProfile({
    id: profileId,
    name: existing?.name || parsed.name,
    email: parsed.email || existing?.email,
    phone: parsed.phone || existing?.phone,
    location: parsed.location || existing?.location,
    skills: parsed.skills.length > 0 ? parsed.skills.join(", ") : existing?.skills,
    seniority: parsed.seniority || existing?.seniority,
    experience_years: parsed.experienceYears || existing?.experience_years,
    summary: parsed.summary || existing?.summary,
  });
}
