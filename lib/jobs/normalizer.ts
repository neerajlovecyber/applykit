/**
 * Job posting normalizer.
 * Takes raw scraped job postings and normalizes them into clean JobPosting database entries.
 */

import { hashJobContent } from "@/lib/utils/hash";
import type { RawJobPosting } from "./types";
import type { JobPosting } from "@/lib/main/db-queries";

export function normalizeRawJob(raw: RawJobPosting): {
  source: string;
  source_id: string;
  title: string;
  company: string;
  location?: string;
  employment_type?: string;
  seniority?: string;
  description?: string;
  requirements?: string;
  salary_info?: string;
  application_url?: string;
  company_url?: string;
  raw_data?: string;
  content_hash: string;
} {
  const cleanTitle = cleanText(raw.title || "Untitled Position");
  const cleanCompany = cleanText(raw.company || "Unknown Company");
  const cleanDesc = cleanText(raw.description || "");

  const contentHash = hashJobContent(cleanTitle, cleanCompany, cleanDesc);

  return {
    source: raw.source.toLowerCase(),
    source_id: raw.sourceId,
    title: cleanTitle,
    company: cleanCompany,
    location: raw.location ? cleanText(raw.location) : undefined,
    employment_type: raw.employmentType ? cleanText(raw.employmentType) : undefined,
    seniority: raw.seniority ? cleanText(raw.seniority) : undefined,
    description: cleanDesc,
    requirements: raw.requirements ? JSON.stringify(raw.requirements) : undefined,
    salary_info: raw.salaryInfo ? cleanText(raw.salaryInfo) : undefined,
    application_url: raw.applicationUrl || undefined,
    company_url: raw.companyUrl || undefined,
    raw_data: raw.rawData ? JSON.stringify(raw.rawData) : undefined,
    content_hash: contentHash,
  };
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")        // Remove HTML tags
    .replace(/\s+/g, " ")           // Collapse multiple spaces/newlines
    .trim();
}
