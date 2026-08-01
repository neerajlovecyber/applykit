/**
 * Document Library & Resume Tailoring types.
 */

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
