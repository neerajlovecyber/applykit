/**
 * Document Library, Intake & Resume Tailoring types.
 */

import type { ProfileRecord, DocumentRecord } from "@/lib/db/schema";

export interface DocumentEntry {
  id: string;
  profile_id: string;
  name: string;
  type: "resume" | "cover_letter" | "portfolio" | "other";
  file_path?: string;
  content_text?: string;
  is_primary: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface NormalizedWorkExp {
  id?: string;
  role: string;
  company: string;
  location: string;
  period: string;
  bulletsStr: string;
  bullets: string[];
}

export interface NormalizedProject {
  id?: string;
  title: string;
  description: string;
}

export interface NormalizedCertification {
  id?: string;
  title: string;
  issuer: string;
}

export interface NormalizedEducation {
  id?: string;
  degree: string;
  institution: string;
  year: string;
}

export interface NormalizedResume {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  skillsStr: string;
  seniority: string;
  experienceYears: number;
  workExperiences: NormalizedWorkExp[];
  projects: NormalizedProject[];
  certifications: NormalizedCertification[];
  educations: NormalizedEducation[];
  rawText: string;
  filePath?: string;
  rawParsed?: Record<string, unknown>;
}

export interface ResumeIntakeOptions {
  filePath?: string;
  rawText?: string;
  profileId?: string;
  profileTrackName?: string;
}

export interface DocumentIntakeResult {
  parsedData: NormalizedResume;
  profile?: ProfileRecord;
  document?: DocumentRecord;
}

export interface ResumeParseResult {
  name: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  seniority: string;
  experienceYears: number;
  summary: string;
  workExperience: Array<{
    company: string;
    role: string;
    duration: string;
    bullets: string[];
  }>;
}

export interface TailoredResumeResult {
  tailoredSummary: string;
  tailoredBullets: string[];
  matchedKeywords: string[];
}
