/**
 * Resume Parser & Normalization Engine.
 *
 * Converts raw resume text and heterogeneous LLM JSON outputs into
 * strictly canonical NormalizedResume data structures.
 */

import { parseResume } from "@/lib/providers/provider-registry";
import type {
  NormalizedResume,
  NormalizedWorkExp,
  NormalizedProject,
  NormalizedCertification,
  NormalizedEducation,
} from "./types";

/**
 * Parse raw resume text into structured fields using Vercel AI SDK.
 */
export async function parseResumeText(rawText: string) {
  return await parseResume(rawText);
}

/**
 * Deep normalization of heterogeneous LLM resume outputs into canonical structures.
 */
export function normalizeResume(
  rawParsed: any,
  rawText = "",
  filePath?: string
): NormalizedResume {
  const data = rawParsed || {};

  // 1. Personal Information & Contact
  const fullName =
    data.personalInfo?.name ||
    data.personal_info?.full_name ||
    data.full_name ||
    data.name ||
    "";
  const email =
    data.personalInfo?.email ||
    data.personal_info?.email ||
    data.email ||
    "";
  const phone =
    data.personalInfo?.phone ||
    data.personal_info?.phone ||
    data.phone ||
    "";
  const location =
    data.personalInfo?.location ||
    data.personal_info?.location ||
    data.location ||
    "";
  const summary = data.summary || "";

  // 2. Technical Skills (Merge & Deduplicate)
  const skillsSet = new Set<string>();
  const rawSkillsList = [
    ...(data.additional?.technicalSkills || []),
    ...(Array.isArray(data.skills) ? data.skills : []),
  ];
  for (const s of rawSkillsList) {
    if (typeof s === "string" && s.trim()) {
      skillsSet.add(s.trim());
    }
  }
  const skills = Array.from(skillsSet);

  // 3. Experience & Seniority
  const experienceYears = Number(
    data.experience_years || data.experienceYears || (skills.length > 8 ? 4 : 2)
  );
  const seniority =
    data.seniority ||
    (experienceYears >= 5 ? "senior" : experienceYears >= 2 ? "mid" : "entry");

  // 4. Work Experience
  const rawExpList = data.workExperience || data.work_experience || [];
  const workExperiences: NormalizedWorkExp[] = Array.isArray(rawExpList)
    ? rawExpList.map((exp: any, idx: number) => {
        const role = exp.title || exp.role || "";
        const company = exp.company || "";
        const expLocation = exp.location || "";
        const period = exp.years || exp.duration || exp.period || "";

        let rawBullets: string[] = [];
        if (Array.isArray(exp.description)) {
          rawBullets = exp.description;
        } else if (typeof exp.description === "string") {
          rawBullets = exp.description.split("\n");
        } else if (Array.isArray(exp.bullets)) {
          rawBullets = exp.bullets;
        }

        const cleanedBullets = rawBullets
          .map((b) => (typeof b === "string" ? b.replace(/^[•\-*]\s*/, "").trim() : ""))
          .filter(Boolean);

        const bulletsStr = cleanedBullets
          .map((b) => (b.startsWith("•") ? b : `• ${b}`))
          .join("\n");

        return {
          id: `exp-${idx}-${Date.now()}`,
          role,
          company,
          location: expLocation,
          period,
          bullets: cleanedBullets,
          bulletsStr,
        };
      })
    : [];

  // 5. Projects
  const rawProjects = data.personalProjects || data.projects || [];
  const projects: NormalizedProject[] = Array.isArray(rawProjects)
    ? rawProjects.map((p: any, idx: number) => {
        const title = p.name || p.title || "Project";
        const descStr = Array.isArray(p.description)
          ? p.description.join("\n")
          : (p.description || "");
        return {
          id: `proj-${idx}-${Date.now()}`,
          title,
          description: descStr,
        };
      })
    : [];

  // 6. Certifications
  const rawCerts = data.certifications || [];
  const certStrings = data.additional?.certificationsTraining || [];
  const certifications: NormalizedCertification[] = [];

  if (Array.isArray(rawCerts) && rawCerts.length > 0) {
    rawCerts.forEach((c: any, idx: number) => {
      certifications.push({
        id: `cert-${idx}-${Date.now()}`,
        title: c.title || "",
        issuer: c.issuer || "",
      });
    });
  } else if (Array.isArray(certStrings)) {
    certStrings.forEach((cert: string, idx: number) => {
      const parts = cert.split(/\s*(?:[-–|]|\bby\b)\s*/i);
      certifications.push({
        id: `cert-${idx}-${Date.now()}`,
        title: parts[0]?.trim() || cert,
        issuer: parts[1]?.trim() || "",
      });
    });
  }

  // 7. Education
  const rawEdu = data.education || [];
  const educations: NormalizedEducation[] = Array.isArray(rawEdu)
    ? rawEdu.map((e: any, idx: number) => ({
        id: `edu-${idx}-${Date.now()}`,
        degree: e.degree || "",
        institution: e.institution || e.university || "",
        year: e.years || e.year || "",
      }))
    : [];

  return {
    fullName,
    email,
    phone,
    location,
    summary,
    skills,
    skillsStr: skills.join(", "),
    seniority,
    experienceYears,
    workExperiences,
    projects,
    certifications,
    educations,
    rawText,
    filePath,
    rawParsed,
  };
}
