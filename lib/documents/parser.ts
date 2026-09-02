/**
 * Resume Parser Engine using Vercel AI SDK.
 *
 * Converts raw resume text / uploaded documents into structured candidate profiles.
 */

import { parseResume } from "@/lib/providers/provider-registry";
import { updateProfile, getProfileById } from "@/lib/db";

/**
 * Parse raw resume text into structured fields using Vercel AI SDK.
 */
export async function parseResumeText(rawText: string) {
  const result = await parseResume(rawText);
  return result;
}

/**
 * Parse resume text and automatically update or create SQLite Profile with full structured JSON.
 */
export async function syncResumeToProfile(profileId: string, rawText: string): Promise<void> {
  const rawParsed = await parseResume(rawText);
  const existing = getProfileById(profileId);

  const name = rawParsed.personalInfo?.name || rawParsed.personal_info?.full_name || rawParsed.full_name || existing?.name || "Candidate";
  const email = rawParsed.personalInfo?.email || rawParsed.personal_info?.email || rawParsed.email || existing?.email || "";
  const phone = rawParsed.personalInfo?.phone || rawParsed.personal_info?.phone || rawParsed.phone || existing?.phone || "";
  const location = rawParsed.personalInfo?.location || rawParsed.personal_info?.location || rawParsed.location || existing?.location || "";
  const skillsList = rawParsed.skills && rawParsed.skills.length > 0
    ? rawParsed.skills
    : rawParsed.additional?.technicalSkills || [];
  const seniority = rawParsed.seniority || existing?.seniority || "mid";
  const experienceYears = rawParsed.experience_years || existing?.experience_years || 2;
  const summary = rawParsed.summary || existing?.summary || "";

  updateProfile(profileId, {
    name,
    full_name: name,
    email: email || existing?.email,
    phone: phone || existing?.phone,
    location: location || existing?.location,
    skills: JSON.stringify(skillsList),
    seniority,
    experience_years: experienceYears,
    summary,
    resume_parsed: JSON.stringify(rawParsed),
  });
}

