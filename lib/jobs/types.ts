/**
 * Types and interfaces for the Job Intelligence layer.
 */

export interface RawJobPosting {
  source: string;              // linkedin, naukri, indeed, lever, greenhouse
  sourceId: string;            // platform-specific unique ID
  title: string;
  company: string;
  location?: string;
  employmentType?: string;
  seniority?: string;
  description?: string;
  requirements?: string[];
  salaryInfo?: string;
  applicationUrl?: string;
  companyUrl?: string;
  postedAt?: string;
  rawData?: Record<string, unknown>;
}

export interface SearchOptions {
  source: "linkedin" | "naukri" | "indeed" | "lever" | "greenhouse" | "all";
  keywords: string;
  location?: string;
  maxPages?: number;
  easyApplyOnly?: boolean;
  experienceYears?: number;
  jobAgeDays?: 1 | 3 | 7 | 15 | 30 | number;
  workMode?: "remote" | "hybrid" | "onSite" | "any" | string;
  filters?: Record<string, unknown>;
}

export interface SearchResultPayload {
  source: string;
  query: SearchOptions;
  jobs: RawJobPosting[];
  totalFound: number;
  scrapedAt: string;
  error?: string;
}
