/**
 * Database Queries Facade Module.
 *
 * Re-exports the typed Drizzle ORM persistence operations from `@/lib/db/queries`
 * to maintain complete backwards compatibility for existing callers while consolidating
 * all SQL queries and schema mappings behind the deep persistence seam.
 */

import type {
  ProfileRecord,
  JobPostingRecord,
  ApplicationRecord,
  QABankRecord,
  SearchQueryRecord,
  PlatformRecord,
  TaskRecord,
  DocumentRecord,
  AutomationPlanRecord,
  SettingRecord,
} from "@/lib/db/schema";

import {
  getProfileById,
  upsertJobPosting,
  updateJobPostingState,
  getApplicationByJobId,
  updateApplicationStatus,
  updateApplicationFillDetails,
  createApplication,
  getApplicationById,
  updateApplicationMaterials,
  getSearchQueryById,
  updateSearchQueryLastRun,
  createDocument,
  getDb,
} from "@/lib/db/queries";

// ── Type Aliases for Backward Compatibility ──

export type Profile = ProfileRecord & {
  years_experience?: number | null;
  expected_salary?: number | null;
  title?: string | null;
};

export type JobPosting = JobPostingRecord;
export type Application = ApplicationRecord;
export type QABankEntry = QABankRecord;
export type SearchQuery = SearchQueryRecord;
export type Platform = PlatformRecord;
export type Task = TaskRecord;
export type Document = DocumentRecord;
export type AutomationPlan = AutomationPlanRecord;
export type Setting = SettingRecord;

// ── Re-export all query operations from lib/db/queries ──

export * from "@/lib/db/queries";

// ── High-Level Workflow & Helper Operations ──

/**
 * Record an auto-apply result, updating job state, application records, and history entries.
 */
export function recordAutoApplyResult(
  profileId: string,
  platform: string,
  result: {
    jobId: string;
    title: string;
    company: string;
    location?: string;
    status: string;
    success: boolean;
    fieldsFilled?: number;
    errorMessage?: string;
    screenshotPath?: string;
    jobUrl?: string;
  }
): { job: JobPosting; application: Application } {
  const jobState = result.status === "submitted" ? "applied" : result.status === "skipped" ? "skipped" : "scored";
  const job = upsertJobPosting({
    source: platform,
    source_id: result.jobId,
    title: result.title,
    company: result.company,
    location: result.location,
    application_url: result.jobUrl,
  });
  updateJobPostingState(job.id, jobState);

  const existingApp = getApplicationByJobId(job.id);
  let appRecord: Application;

  if (existingApp) {
    updateApplicationStatus(existingApp.id, result.status, `Auto-apply ${platform}`);
    if (result.fieldsFilled !== undefined || result.screenshotPath !== undefined) {
      updateApplicationFillDetails(existingApp.id, {
        fields_filled: result.fieldsFilled ?? 0,
        fields_total: result.fieldsFilled ?? 0,
        screenshot_path: result.screenshotPath,
        fill_details: result.errorMessage,
      });
    }
    appRecord = getApplicationById(existingApp.id)!;
  } else {
    appRecord = createApplication({
      job_id: job.id,
      profile_id: profileId,
      status: result.status,
    });
    if (result.fieldsFilled !== undefined || result.screenshotPath !== undefined) {
      updateApplicationFillDetails(appRecord.id, {
        fields_filled: result.fieldsFilled ?? 0,
        fields_total: result.fieldsFilled ?? 0,
        screenshot_path: result.screenshotPath,
        fill_details: result.errorMessage,
      });
    }
    appRecord = getApplicationById(appRecord.id)!;
  }

  return { job, application: appRecord };
}

export function updateApplicationDrafts(id: string, coverLetter?: string, tailoredResume?: string): void {
  updateApplicationMaterials(id, { cover_letter: coverLetter, resume_version: tailoredResume });
}

export function updateSearchQuery(id: string, data: any): void {
  const query = getSearchQueryById(id);
  if (!query) return;
  getDb().prepare("UPDATE search_queries SET keywords = ?, location = ? WHERE id = ?").run(
    data.keywords ?? query.keywords,
    data.location ?? query.location,
    id
  );
}

export function recordSearchRun(id: string, foundCount: number): void {
  updateSearchQueryLastRun(id, foundCount, true);
}

export function insertDocument(data: {
  profile_id: string;
  name: string;
  type: string;
  content_text?: string;
  is_primary?: boolean;
}): Document {
  return createDocument({
    profile_id: data.profile_id,
    doc_type: data.type,
    display_name: data.name,
    file_path: "",
    extracted_text: data.content_text,
    is_default: data.is_primary ? 1 : 0,
  });
}
