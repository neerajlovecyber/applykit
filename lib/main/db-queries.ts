import { randomUUID } from "crypto";
import { getDb } from "./db";

// ─── Types ──────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  summary: string | null;
  skills: string;
  experience_years: number | null;
  seniority: string;
  target_titles: string;
  target_locations: string;
  work_mode: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  target_industries: string;
  exclude_companies: string;
  exclude_keywords: string;
  min_company_size: string | null;
  visa_required: number;
  resume_path: string | null;
  resume_data: string | null;
  resume_parsed: string | null;
  cover_letter_template: string | null;
  default_answers: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  source: string;
  source_id: string;
  title: string;
  company: string;
  location: string | null;
  employment_type: string | null;
  seniority: string | null;
  description: string | null;
  requirements: string | null;
  salary_info: string | null;
  application_url: string | null;
  company_url: string | null;
  match_score: number | null;
  match_breakdown: string | null;
  match_explanation: string | null;
  state: string;
  discovered_at: string;
  last_seen_at: string;
  expires_at: string | null;
  raw_data: string | null;
  content_hash: string | null;
}

export interface Application {
  id: string;
  job_id: string;
  profile_id: string;
  status: string;
  resume_version: string | null;
  cover_letter: string | null;
  qa_responses: string | null;
  fields_filled: number | null;
  fields_total: number | null;
  fill_details: string | null;
  screenshot_path: string | null;
  outcome: string | null;
  outcome_note: string | null;
  outcome_updated_at: string | null;
  state_history: string;
  error_log: string | null;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
}

export interface QABankEntry {
  id: string;
  profile_id: string;
  question_pattern: string;
  question_type: string | null;
  answer: string;
  variants: string;
  confidence: string;
  source: string;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface SearchQuery {
  id: string;
  profile_id: string;
  source: string;
  keywords: string;
  location: string | null;
  filters: string;
  status: string;
  last_run_at: string | null;
  last_success_at: string | null;
  result_count: number;
  max_pages: number;
  run_interval_hours: number;
  next_run_at: string | null;
  created_at: string;
}

export interface Platform {
  id: string;
  name: string;
  status: string;
  cookies: string | null;
  auth_token: string | null;
  connected_at: string | null;
  last_checked_at: string | null;
  expires_at: string | null;
  error_message: string | null;
  daily_limit: number | null;
  applied_today: number;
  limit_reset_at: string | null;
}

export interface Task {
  id: string;
  kind: string;
  status: string;
  payload: string | null;
  result: string | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  job_id: string | null;
  application_id: string | null;
  parent_task_id: string | null;
  scheduled_for: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  profile_id: string;
  doc_type: string;
  display_name: string;
  file_path: string;
  file_format: string | null;
  extracted_text: string | null;
  parsed_structure: string | null;
  checksum: string | null;
  size_bytes: number | null;
  origin: string;
  source_job_id: string | null;
  is_default: number;
  created_at: string;
}

export interface AutomationPlan {
  id: string;
  profile_id: string;
  name: string;
  steps: string;
  auto_apply: number;
  min_match_score: number;
  max_applies_per_run: number;
  enabled: number;
  run_interval_hours: number;
  last_run_at: string | null;
  next_run_at: string | null;
  total_runs: number;
  total_applied: number;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

// Legacy types (backward compat)
export interface Job {
  id: string;
  title: string;
  company: string | null;
  url: string;
  platform: string | null;
  status: string;
  profile_id: string | null;
  error_message: string | null;
  added_at: string;
  applied_at: string | null;
}

export interface HistoryEntry {
  id: string;
  job_id: string | null;
  title: string | null;
  company: string | null;
  platform: string | null;
  url: string | null;
  profile_id: string | null;
  profile_name: string | null;
  status: string | null;
  error_message: string | null;
  applied_at: string;
}

// ═══════════════════════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════════════════════

export function getProfiles(): Profile[] {
  return getDb().prepare("SELECT * FROM profiles ORDER BY created_at DESC").all() as Profile[];
}

export function getProfileById(id: string): Profile | undefined {
  return getDb().prepare("SELECT * FROM profiles WHERE id = ?").get(id) as Profile | undefined;
}

export function getActiveProfile(): Profile | undefined {
  return getDb().prepare("SELECT * FROM profiles WHERE is_active = 1").get() as Profile | undefined;
}

export function createProfile(data: Partial<Profile>): Profile {
  const id = randomUUID();
  const db = getDb();

  db.prepare(`
    INSERT INTO profiles (id, name, full_name, email, phone, location, linkedin_url, portfolio_url,
      summary, skills, experience_years, seniority, target_titles, target_locations, work_mode,
      salary_min, salary_max, salary_currency, target_industries, exclude_companies, exclude_keywords,
      min_company_size, visa_required, resume_path, resume_data, resume_parsed, cover_letter_template,
      default_answers, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name ?? "New Profile",
    data.full_name ?? null,
    data.email ?? null,
    data.phone ?? null,
    data.location ?? null,
    data.linkedin_url ?? null,
    data.portfolio_url ?? null,
    data.summary ?? null,
    data.skills ?? "[]",
    data.experience_years ?? null,
    data.seniority ?? "mid",
    data.target_titles ?? "[]",
    data.target_locations ?? "[]",
    data.work_mode ?? "any",
    data.salary_min ?? null,
    data.salary_max ?? null,
    data.salary_currency ?? "INR",
    data.target_industries ?? "[]",
    data.exclude_companies ?? "[]",
    data.exclude_keywords ?? "[]",
    data.min_company_size ?? null,
    data.visa_required ?? 0,
    data.resume_path ?? null,
    data.resume_data ?? null,
    data.resume_parsed ?? null,
    data.cover_letter_template ?? null,
    data.default_answers ?? "{}",
    data.is_active ?? 0,
  );

  return getProfileById(id)!;
}

export function updateProfile(id: string, data: Partial<Profile>): Profile | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "created_at") continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return getProfileById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  getDb().prepare(`UPDATE profiles SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getProfileById(id);
}

export function setActiveProfile(id: string): void {
  const db = getDb();
  db.prepare("UPDATE profiles SET is_active = 0").run();
  db.prepare("UPDATE profiles SET is_active = 1 WHERE id = ?").run(id);
}

export function deleteProfile(id: string): void {
  getDb().prepare("DELETE FROM profiles WHERE id = ?").run(id);
}

// ═══════════════════════════════════════════════════════════
// JOB POSTINGS
// ═══════════════════════════════════════════════════════════

export function getJobPostings(filters?: {
  state?: string;
  source?: string;
  minScore?: number;
  limit?: number;
  offset?: number;
}): JobPosting[] {
  let query = "SELECT * FROM job_postings WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.state) {
    query += " AND state = ?";
    params.push(filters.state);
  }
  if (filters?.source) {
    query += " AND source = ?";
    params.push(filters.source);
  }
  if (filters?.minScore !== undefined) {
    query += " AND match_score >= ?";
    params.push(filters.minScore);
  }

  query += " ORDER BY discovered_at DESC";

  if (filters?.limit) {
    query += " LIMIT ?";
    params.push(filters.limit);
  }
  if (filters?.offset) {
    query += " OFFSET ?";
    params.push(filters.offset);
  }

  return getDb().prepare(query).all(...params) as JobPosting[];
}

export function getJobPostingById(id: string): JobPosting | undefined {
  return getDb().prepare("SELECT * FROM job_postings WHERE id = ?").get(id) as JobPosting | undefined;
}

export function getJobPostingBySourceId(source: string, sourceId: string): JobPosting | undefined {
  return getDb()
    .prepare("SELECT * FROM job_postings WHERE source = ? AND source_id = ?")
    .get(source, sourceId) as JobPosting | undefined;
}

export function upsertJobPosting(data: {
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
  content_hash?: string;
}): JobPosting {
  const existing = getJobPostingBySourceId(data.source, data.source_id);

  if (existing) {
    // Update last_seen and any changed fields
    getDb().prepare(`
      UPDATE job_postings SET
        title = ?, company = ?, location = ?, employment_type = ?, seniority = ?,
        description = ?, requirements = ?, salary_info = ?, application_url = ?,
        company_url = ?, raw_data = ?, content_hash = ?, last_seen_at = datetime('now')
      WHERE id = ?
    `).run(
      data.title, data.company, data.location ?? null, data.employment_type ?? null,
      data.seniority ?? null, data.description ?? null, data.requirements ?? null,
      data.salary_info ?? null, data.application_url ?? null, data.company_url ?? null,
      data.raw_data ?? null, data.content_hash ?? null, existing.id,
    );
    return getJobPostingById(existing.id)!;
  }

  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO job_postings (id, source, source_id, title, company, location, employment_type,
      seniority, description, requirements, salary_info, application_url, company_url, raw_data, content_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.source, data.source_id, data.title, data.company,
    data.location ?? null, data.employment_type ?? null, data.seniority ?? null,
    data.description ?? null, data.requirements ?? null, data.salary_info ?? null,
    data.application_url ?? null, data.company_url ?? null, data.raw_data ?? null,
    data.content_hash ?? null,
  );

  return getJobPostingById(id)!;
}

export function updateJobPostingState(id: string, state: string): void {
  getDb().prepare("UPDATE job_postings SET state = ? WHERE id = ?").run(state, id);
}

export function updateJobPostingScore(
  id: string,
  score: number,
  breakdown?: string,
  explanation?: string,
): void {
  getDb().prepare(`
    UPDATE job_postings SET match_score = ?, match_breakdown = ?, match_explanation = ?
    WHERE id = ?
  `).run(score, breakdown ?? null, explanation ?? null, id);
}

export function getJobPostingStats(): {
  total: number;
  new: number;
  scored: number;
  queued: number;
  applied: number;
  skipped: number;
} {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as count FROM job_postings").get() as { count: number }).count;
  const newCount = (db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE state = 'new'").get() as { count: number }).count;
  const scored = (db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE state = 'scored'").get() as { count: number }).count;
  const queued = (db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE state = 'queued'").get() as { count: number }).count;
  const applied = (db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE state = 'applied'").get() as { count: number }).count;
  const skipped = (db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE state = 'skipped'").get() as { count: number }).count;
  return { total, new: newCount, scored, queued, applied, skipped };
}

// ═══════════════════════════════════════════════════════════
// APPLICATIONS
// ═══════════════════════════════════════════════════════════

export function getApplications(filters?: {
  status?: string;
  outcome?: string;
  profileId?: string;
  limit?: number;
}): Application[] {
  let query = "SELECT * FROM applications WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters?.outcome) {
    query += " AND outcome = ?";
    params.push(filters.outcome);
  }
  if (filters?.profileId) {
    query += " AND profile_id = ?";
    params.push(filters.profileId);
  }

  query += " ORDER BY created_at DESC";

  if (filters?.limit) {
    query += " LIMIT ?";
    params.push(filters.limit);
  }

  return getDb().prepare(query).all(...params) as Application[];
}

export function getApplicationById(id: string): Application | undefined {
  return getDb().prepare("SELECT * FROM applications WHERE id = ?").get(id) as Application | undefined;
}

export function getApplicationByJobId(jobId: string): Application | undefined {
  return getDb()
    .prepare("SELECT * FROM applications WHERE job_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(jobId) as Application | undefined;
}

export function createApplication(data: {
  job_id: string;
  profile_id: string;
  status?: string;
  resume_version?: string;
  cover_letter?: string;
}): Application {
  const id = randomUUID();
  const initialHistory = JSON.stringify([
    { from: null, to: data.status ?? "pending_review", at: new Date().toISOString(), reason: "created" },
  ]);

  getDb().prepare(`
    INSERT INTO applications (id, job_id, profile_id, status, resume_version, cover_letter, state_history)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.job_id, data.profile_id, data.status ?? "pending_review",
    data.resume_version ?? null, data.cover_letter ?? null, initialHistory,
  );

  return getApplicationById(id)!;
}

export function updateApplicationStatus(id: string, status: string, reason?: string): void {
  const app = getApplicationById(id);
  if (!app) return;

  const history = JSON.parse(app.state_history || "[]");
  history.push({ from: app.status, to: status, at: new Date().toISOString(), reason: reason ?? null });

  const submittedAt = status === "submitted" ? new Date().toISOString() : app.submitted_at;

  getDb().prepare(`
    UPDATE applications SET status = ?, state_history = ?, submitted_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, JSON.stringify(history), submittedAt, id);
}

export function updateApplicationOutcome(id: string, outcome: string, note?: string): void {
  getDb().prepare(`
    UPDATE applications SET outcome = ?, outcome_note = ?, outcome_updated_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(outcome, note ?? null, id);
}

export function updateApplicationMaterials(id: string, data: {
  resume_version?: string;
  cover_letter?: string;
  qa_responses?: string;
}): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.resume_version !== undefined) { fields.push("resume_version = ?"); values.push(data.resume_version); }
  if (data.cover_letter !== undefined) { fields.push("cover_letter = ?"); values.push(data.cover_letter); }
  if (data.qa_responses !== undefined) { fields.push("qa_responses = ?"); values.push(data.qa_responses); }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  getDb().prepare(`UPDATE applications SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function updateApplicationFillDetails(id: string, data: {
  fields_filled: number;
  fields_total: number;
  fill_details?: string;
  screenshot_path?: string;
}): void {
  getDb().prepare(`
    UPDATE applications SET fields_filled = ?, fields_total = ?, fill_details = ?, screenshot_path = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(data.fields_filled, data.fields_total, data.fill_details ?? null, data.screenshot_path ?? null, id);
}

export function getApplicationStats(): {
  total: number;
  pending: number;
  approved: number;
  submitted: number;
  failed: number;
  todayCount: number;
  weekCount: number;
} {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as count FROM applications").get() as { count: number }).count;
  const pending = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'pending_review'").get() as { count: number }).count;
  const approved = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'approved'").get() as { count: number }).count;
  const submitted = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'submitted'").get() as { count: number }).count;
  const failed = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'failed'").get() as { count: number }).count;
  const todayCount = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE date(submitted_at) = date('now')").get() as { count: number }).count;
  const weekCount = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE submitted_at >= datetime('now', '-7 days')").get() as { count: number }).count;
  return { total, pending, approved, submitted, failed, todayCount, weekCount };
}

// ═══════════════════════════════════════════════════════════
// QA BANK
// ═══════════════════════════════════════════════════════════

export function getQABankEntries(profileId: string): QABankEntry[] {
  return getDb()
    .prepare("SELECT * FROM qa_bank WHERE profile_id = ? ORDER BY use_count DESC")
    .all(profileId) as QABankEntry[];
}

export function findQAAnswer(profileId: string, questionPattern: string): QABankEntry | undefined {
  // Try exact match first, then fuzzy
  const exact = getDb()
    .prepare("SELECT * FROM qa_bank WHERE profile_id = ? AND question_pattern = ?")
    .get(profileId, questionPattern) as QABankEntry | undefined;

  if (exact) return exact;

  // Try LIKE match for partial patterns
  return getDb()
    .prepare("SELECT * FROM qa_bank WHERE profile_id = ? AND ? LIKE '%' || question_pattern || '%' ORDER BY confidence DESC LIMIT 1")
    .get(profileId, questionPattern) as QABankEntry | undefined;
}

export function upsertQABankEntry(data: {
  profile_id: string;
  question_pattern: string;
  answer: string;
  question_type?: string;
  confidence?: string;
  source?: string;
}): QABankEntry {
  const existing = getDb()
    .prepare("SELECT * FROM qa_bank WHERE profile_id = ? AND question_pattern = ?")
    .get(data.profile_id, data.question_pattern) as QABankEntry | undefined;

  if (existing) {
    getDb().prepare(`
      UPDATE qa_bank SET answer = ?, question_type = ?, confidence = ?, source = ?
      WHERE id = ?
    `).run(data.answer, data.question_type ?? existing.question_type, data.confidence ?? existing.confidence, data.source ?? existing.source, existing.id);
    return getDb().prepare("SELECT * FROM qa_bank WHERE id = ?").get(existing.id) as QABankEntry;
  }

  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO qa_bank (id, profile_id, question_pattern, question_type, answer, confidence, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.profile_id, data.question_pattern, data.question_type ?? null, data.answer, data.confidence ?? "high", data.source ?? "manual");

  return getDb().prepare("SELECT * FROM qa_bank WHERE id = ?").get(id) as QABankEntry;
}

export function incrementQAUsage(id: string): void {
  getDb().prepare("UPDATE qa_bank SET use_count = use_count + 1, last_used_at = datetime('now') WHERE id = ?").run(id);
}

export function deleteQABankEntry(id: string): void {
  getDb().prepare("DELETE FROM qa_bank WHERE id = ?").run(id);
}

// ═══════════════════════════════════════════════════════════
// SEARCH QUERIES
// ═══════════════════════════════════════════════════════════

export function getSearchQueries(profileId?: string): SearchQuery[] {
  if (profileId) {
    return getDb()
      .prepare("SELECT * FROM search_queries WHERE profile_id = ? ORDER BY created_at DESC")
      .all(profileId) as SearchQuery[];
  }
  return getDb().prepare("SELECT * FROM search_queries ORDER BY created_at DESC").all() as SearchQuery[];
}

export function getSearchQueryById(id: string): SearchQuery | undefined {
  return getDb().prepare("SELECT * FROM search_queries WHERE id = ?").get(id) as SearchQuery | undefined;
}

export function createSearchQuery(data: {
  profile_id: string;
  source: string;
  keywords: string;
  location?: string;
  filters?: string;
  max_pages?: number;
  run_interval_hours?: number;
}): SearchQuery {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO search_queries (id, profile_id, source, keywords, location, filters, max_pages, run_interval_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.profile_id, data.source, data.keywords, data.location ?? null, data.filters ?? "{}", data.max_pages ?? 3, data.run_interval_hours ?? 24);

  return getSearchQueryById(id)!;
}

export function updateSearchQueryStatus(id: string, status: string): void {
  getDb().prepare("UPDATE search_queries SET status = ? WHERE id = ?").run(status, id);
}

export function updateSearchQueryLastRun(id: string, resultCount: number, success: boolean): void {
  const now = new Date().toISOString();
  const query = getSearchQueryById(id);
  if (!query) return;

  const nextRun = new Date(Date.now() + query.run_interval_hours * 60 * 60 * 1000).toISOString();

  getDb().prepare(`
    UPDATE search_queries SET last_run_at = ?, last_success_at = ?, result_count = ?, next_run_at = ?
    WHERE id = ?
  `).run(now, success ? now : query.last_success_at, resultCount, nextRun, id);
}

export function deleteSearchQuery(id: string): void {
  getDb().prepare("DELETE FROM search_queries WHERE id = ?").run(id);
}

// ═══════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════

export function getTasks(filters?: {
  status?: string;
  kind?: string;
  limit?: number;
}): Task[] {
  let query = "SELECT * FROM tasks WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters?.kind) {
    query += " AND kind = ?";
    params.push(filters.kind);
  }

  query += " ORDER BY created_at DESC";

  if (filters?.limit) {
    query += " LIMIT ?";
    params.push(filters.limit);
  }

  return getDb().prepare(query).all(...params) as Task[];
}

export function getTaskById(id: string): Task | undefined {
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
}

export function getNextPendingTask(): Task | undefined {
  return getDb()
    .prepare("SELECT * FROM tasks WHERE status = 'queued' AND scheduled_for <= datetime('now') ORDER BY scheduled_for ASC LIMIT 1")
    .get() as Task | undefined;
}

export function createTask(data: {
  kind: string;
  payload?: string;
  job_id?: string;
  application_id?: string;
  parent_task_id?: string;
  scheduled_for?: string;
  max_attempts?: number;
}): Task {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO tasks (id, kind, payload, job_id, application_id, parent_task_id, scheduled_for, max_attempts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.kind, data.payload ?? null, data.job_id ?? null,
    data.application_id ?? null, data.parent_task_id ?? null,
    data.scheduled_for ?? new Date().toISOString(), data.max_attempts ?? 3,
  );

  return getTaskById(id)!;
}

export function updateTaskStatus(id: string, status: string, result?: string, error?: string): void {
  const now = new Date().toISOString();
  const startedAt = status === "running" ? now : undefined;
  const finishedAt = (status === "succeeded" || status === "failed" || status === "cancelled") ? now : undefined;

  if (startedAt) {
    getDb().prepare("UPDATE tasks SET status = ?, started_at = ?, attempts = attempts + 1 WHERE id = ?")
      .run(status, startedAt, id);
  } else if (finishedAt) {
    getDb().prepare("UPDATE tasks SET status = ?, result = ?, error = ?, finished_at = ? WHERE id = ?")
      .run(status, result ?? null, error ?? null, finishedAt, id);
  } else {
    getDb().prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, id);
  }
}

export function getTaskStats(): {
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
} {
  const db = getDb();
  const queued = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'queued'").get() as { count: number }).count;
  const running = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'running'").get() as { count: number }).count;
  const succeeded = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'succeeded'").get() as { count: number }).count;
  const failed = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'failed'").get() as { count: number }).count;
  return { queued, running, succeeded, failed };
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════

export function getDocuments(profileId: string, docType?: string): Document[] {
  if (docType) {
    return getDb()
      .prepare("SELECT * FROM documents WHERE profile_id = ? AND doc_type = ? ORDER BY created_at DESC")
      .all(profileId, docType) as Document[];
  }
  return getDb()
    .prepare("SELECT * FROM documents WHERE profile_id = ? ORDER BY created_at DESC")
    .all(profileId) as Document[];
}

export function getDocumentById(id: string): Document | undefined {
  return getDb().prepare("SELECT * FROM documents WHERE id = ?").get(id) as Document | undefined;
}

export function createDocument(data: {
  profile_id: string;
  doc_type: string;
  display_name: string;
  file_path: string;
  file_format?: string;
  extracted_text?: string;
  parsed_structure?: string;
  checksum?: string;
  size_bytes?: number;
  origin?: string;
  source_job_id?: string;
  is_default?: number;
}): Document {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO documents (id, profile_id, doc_type, display_name, file_path, file_format,
      extracted_text, parsed_structure, checksum, size_bytes, origin, source_job_id, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.profile_id, data.doc_type, data.display_name, data.file_path,
    data.file_format ?? null, data.extracted_text ?? null, data.parsed_structure ?? null,
    data.checksum ?? null, data.size_bytes ?? null, data.origin ?? "uploaded",
    data.source_job_id ?? null, data.is_default ?? 0,
  );

  return getDocumentById(id)!;
}

export function deleteDocument(id: string): void {
  getDb().prepare("DELETE FROM documents WHERE id = ?").run(id);
}

// ═══════════════════════════════════════════════════════════
// AUTOMATION PLANS
// ═══════════════════════════════════════════════════════════

export function getAutomationPlans(profileId?: string): AutomationPlan[] {
  if (profileId) {
    return getDb()
      .prepare("SELECT * FROM automation_plans WHERE profile_id = ? ORDER BY created_at DESC")
      .all(profileId) as AutomationPlan[];
  }
  return getDb().prepare("SELECT * FROM automation_plans ORDER BY created_at DESC").all() as AutomationPlan[];
}

export function getAutomationPlanById(id: string): AutomationPlan | undefined {
  return getDb().prepare("SELECT * FROM automation_plans WHERE id = ?").get(id) as AutomationPlan | undefined;
}

export function createAutomationPlan(data: {
  profile_id: string;
  name: string;
  steps: string;
  auto_apply?: number;
  min_match_score?: number;
  max_applies_per_run?: number;
  run_interval_hours?: number;
}): AutomationPlan {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO automation_plans (id, profile_id, name, steps, auto_apply, min_match_score, max_applies_per_run, run_interval_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.profile_id, data.name, data.steps,
    data.auto_apply ?? 0, data.min_match_score ?? 0.7,
    data.max_applies_per_run ?? 10, data.run_interval_hours ?? 24,
  );

  return getAutomationPlanById(id)!;
}

export function updateAutomationPlan(id: string, data: Partial<AutomationPlan>): AutomationPlan | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "created_at" || key === "profile_id") continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return getAutomationPlanById(id);
  values.push(id);

  getDb().prepare(`UPDATE automation_plans SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getAutomationPlanById(id);
}

export function recordAutomationRun(id: string, appliedCount: number): void {
  getDb().prepare(`
    UPDATE automation_plans SET
      total_runs = total_runs + 1,
      total_applied = total_applied + ?,
      last_run_at = datetime('now')
    WHERE id = ?
  `).run(appliedCount, id);
}

export function deleteAutomationPlan(id: string): void {
  getDb().prepare("DELETE FROM automation_plans WHERE id = ?").run(id);
}

// ═══════════════════════════════════════════════════════════
// PLATFORMS (enhanced)
// ═══════════════════════════════════════════════════════════

export function getPlatforms(): Platform[] {
  return getDb().prepare("SELECT * FROM platforms ORDER BY name").all() as Platform[];
}

export function getPlatformById(id: string): Platform | undefined {
  return getDb().prepare("SELECT * FROM platforms WHERE id = ?").get(id) as Platform | undefined;
}

export function updatePlatformStatus(id: string, status: string, cookies?: string): void {
  const connectedAt = status === "connected" ? new Date().toISOString() : null;
  getDb().prepare("UPDATE platforms SET status = ?, cookies = ?, connected_at = ?, last_checked_at = datetime('now') WHERE id = ?")
    .run(status, cookies ?? null, connectedAt, id);
}

export function updatePlatformDailyCount(id: string, count: number): void {
  getDb().prepare("UPDATE platforms SET applied_today = ? WHERE id = ?").run(count, id);
}

export function resetPlatformDailyCounts(): void {
  getDb().prepare("UPDATE platforms SET applied_today = 0, limit_reset_at = datetime('now')").run();
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════

export function getSetting(key: string): string | undefined {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as Setting | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare("SELECT * FROM settings").all() as Setting[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// LEGACY: Jobs (backward compatibility)
// ═══════════════════════════════════════════════════════════

export function getJobs(status?: string): Job[] {
  if (status) {
    return getDb().prepare("SELECT * FROM jobs WHERE status = ? ORDER BY added_at DESC").all(status) as Job[];
  }
  return getDb().prepare("SELECT * FROM jobs ORDER BY added_at DESC").all() as Job[];
}

export function getJobById(id: string): Job | undefined {
  return getDb().prepare("SELECT * FROM jobs WHERE id = ?").get(id) as Job | undefined;
}

export function addJob(data: { title: string; company?: string; url: string; platform?: string; profile_id?: string }): Job {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO jobs (id, title, company, url, platform, profile_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.title, data.company ?? null, data.url, data.platform ?? null, data.profile_id ?? null);

  return getJobById(id)!;
}

export function updateJobStatus(id: string, status: string, errorMessage?: string): void {
  const appliedAt = status === "done" ? new Date().toISOString() : null;
  getDb().prepare("UPDATE jobs SET status = ?, error_message = ?, applied_at = ? WHERE id = ?")
    .run(status, errorMessage ?? null, appliedAt, id);
}

export function removeJob(id: string): void {
  getDb().prepare("DELETE FROM jobs WHERE id = ?").run(id);
}

export function clearCompletedJobs(): number {
  const result = getDb().prepare("DELETE FROM jobs WHERE status IN ('done', 'failed', 'skipped')").run();
  return result.changes;
}

export function getQueueStats(): { pending: number; running: number; done: number; failed: number; total: number } {
  const db = getDb();
  const pending = (db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'queued'").get() as { count: number }).count;
  const running = (db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'running'").get() as { count: number }).count;
  const done = (db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'done'").get() as { count: number }).count;
  const failed = (db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'failed'").get() as { count: number }).count;
  return { pending, running, done, failed, total: pending + running + done + failed };
}

// ═══════════════════════════════════════════════════════════
// LEGACY: History (backward compatibility)
// ═══════════════════════════════════════════════════════════

export function getHistory(filters?: { status?: string; platform?: string; limit?: number }): HistoryEntry[] {
  let query = "SELECT * FROM history WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters?.platform) {
    query += " AND platform = ?";
    params.push(filters.platform);
  }

  query += " ORDER BY applied_at DESC";

  if (filters?.limit) {
    query += " LIMIT ?";
    params.push(filters.limit);
  }

  return getDb().prepare(query).all(...params) as HistoryEntry[];
}

export function addHistoryEntry(data: Omit<HistoryEntry, "id" | "applied_at">): HistoryEntry {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO history (id, job_id, title, company, platform, url, profile_id, profile_name, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.job_id, data.title, data.company, data.platform, data.url, data.profile_id, data.profile_name, data.status, data.error_message);

  return getDb().prepare("SELECT * FROM history WHERE id = ?").get(id) as HistoryEntry;
}

export function getHistoryStats(): { total: number; applied: number; failed: number; todayCount: number; weekCount: number } {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as count FROM history").get() as { count: number }).count;
  const applied = (db.prepare("SELECT COUNT(*) as count FROM history WHERE status = 'applied'").get() as { count: number }).count;
  const failed = (db.prepare("SELECT COUNT(*) as count FROM history WHERE status = 'failed'").get() as { count: number }).count;
  const todayCount = (db.prepare("SELECT COUNT(*) as count FROM history WHERE date(applied_at) = date('now')").get() as { count: number }).count;
  const weekCount = (db.prepare("SELECT COUNT(*) as count FROM history WHERE applied_at >= datetime('now', '-7 days')").get() as { count: number }).count;
  return { total, applied, failed, todayCount, weekCount };
}
