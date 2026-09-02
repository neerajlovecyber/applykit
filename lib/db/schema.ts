import { sqliteTable, text, integer, real, index, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ════════════════════════════════════════════════════════════
// PROFILES
// ════════════════════════════════════════════════════════════

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  full_name: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  linkedin_url: text("linkedin_url"),
  portfolio_url: text("portfolio_url"),
  summary: text("summary"),
  skills: text("skills").default(sql`'[]'`),
  experience_years: integer("experience_years"),
  seniority: text("seniority").default("mid"),
  target_titles: text("target_titles").default(sql`'[]'`),
  target_locations: text("target_locations").default(sql`'[]'`),
  work_mode: text("work_mode").default("any"),
  salary_min: integer("salary_min"),
  salary_max: integer("salary_max"),
  salary_currency: text("salary_currency").default("INR"),
  target_industries: text("target_industries").default(sql`'[]'`),
  exclude_companies: text("exclude_companies").default(sql`'[]'`),
  exclude_keywords: text("exclude_keywords").default(sql`'[]'`),
  min_company_size: text("min_company_size"),
  visa_required: integer("visa_required").default(0),
  resume_path: text("resume_path"),
  resume_data: text("resume_data"),
  resume_parsed: text("resume_parsed"),
  cover_letter_template: text("cover_letter_template"),
  default_answers: text("default_answers").default(sql`'{}'`),
  notice_period: text("notice_period").default("30 days"),
  is_active: integer("is_active").default(0),
  created_at: text("created_at").default(sql`(datetime('now'))`),
  updated_at: text("updated_at").default(sql`(datetime('now'))`),
});

export type ProfileRecord = typeof profiles.$inferSelect;
export type NewProfileRecord = typeof profiles.$inferInsert;

// ════════════════════════════════════════════════════════════
// QA BANK
// ════════════════════════════════════════════════════════════

export const qaBank = sqliteTable(
  "qa_bank",
  {
    id: text("id").primaryKey(),
    profile_id: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    question_pattern: text("question_pattern").notNull(),
    question_type: text("question_type"),
    answer: text("answer").notNull(),
    variants: text("variants", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
    confidence: text("confidence").default("high"),
    source: text("source").default("manual"),
    use_count: integer("use_count").default(0),
    last_used_at: text("last_used_at"),
    created_at: text("created_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_qa_bank_profile").on(table.profile_id),
    index("idx_qa_bank_pattern").on(table.question_pattern),
  ],
);

export type QABankRecord = typeof qaBank.$inferSelect;
export type NewQABankRecord = typeof qaBank.$inferInsert;

// ════════════════════════════════════════════════════════════
// JOB POSTINGS
// ════════════════════════════════════════════════════════════

export const jobPostings = sqliteTable(
  "job_postings",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    source_id: text("source_id").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    employment_type: text("employment_type"),
    seniority: text("seniority"),
    description: text("description"),
    requirements: text("requirements"),
    salary_info: text("salary_info"),
    application_url: text("application_url"),
    company_url: text("company_url"),
    match_score: real("match_score"),
    match_breakdown: text("match_breakdown"),
    match_explanation: text("match_explanation"),
    state: text("state").default("new"),
    discovered_at: text("discovered_at").default(sql`(datetime('now'))`),
    last_seen_at: text("last_seen_at").default(sql`(datetime('now'))`),
    expires_at: text("expires_at"),
    raw_data: text("raw_data"),
    content_hash: text("content_hash"),
  },
  (table) => [
    unique().on(table.source, table.source_id),
    index("idx_job_postings_state").on(table.state),
    index("idx_job_postings_company").on(table.company),
    index("idx_job_postings_score").on(table.match_score),
    index("idx_job_postings_discovered").on(table.discovered_at),
    index("idx_job_postings_source").on(table.source, table.source_id),
    index("idx_job_postings_content_hash").on(table.content_hash),
  ],
);

export type JobPostingRecord = typeof jobPostings.$inferSelect;
export type NewJobPostingRecord = typeof jobPostings.$inferInsert;

// ════════════════════════════════════════════════════════════
// APPLICATIONS
// ════════════════════════════════════════════════════════════

export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    job_id: text("job_id")
      .notNull()
      .references(() => jobPostings.id),
    profile_id: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").default("pending_review"),
    resume_version: text("resume_version"),
    cover_letter: text("cover_letter"),
    qa_responses: text("qa_responses"),
    fields_filled: integer("fields_filled"),
    fields_total: integer("fields_total"),
    fill_details: text("fill_details"),
    screenshot_path: text("screenshot_path"),
    outcome: text("outcome"),
    outcome_note: text("outcome_note"),
    outcome_updated_at: text("outcome_updated_at"),
    state_history: text("state_history").default(sql`'[]'`),
    error_log: text("error_log"),
    created_at: text("created_at").default(sql`(datetime('now'))`),
    submitted_at: text("submitted_at"),
    updated_at: text("updated_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_applications_status").on(table.status),
    index("idx_applications_job").on(table.job_id),
    index("idx_applications_outcome").on(table.outcome),
  ],
);

export type ApplicationRecord = typeof applications.$inferSelect;
export type NewApplicationRecord = typeof applications.$inferInsert;

// ════════════════════════════════════════════════════════════
// SEARCH QUERIES
// ════════════════════════════════════════════════════════════

export const searchQueries = sqliteTable(
  "search_queries",
  {
    id: text("id").primaryKey(),
    profile_id: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    keywords: text("keywords").notNull(),
    location: text("location"),
    filters: text("filters").default(sql`'{}'`),
    status: text("status").default("active"),
    last_run_at: text("last_run_at"),
    last_success_at: text("last_success_at"),
    result_count: integer("result_count").default(0),
    max_pages: integer("max_pages").default(3),
    run_interval_hours: integer("run_interval_hours").default(24),
    next_run_at: text("next_run_at"),
    created_at: text("created_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_search_queries_profile").on(table.profile_id),
    index("idx_search_queries_status").on(table.status),
  ],
);

export type SearchQueryRecord = typeof searchQueries.$inferSelect;
export type NewSearchQueryRecord = typeof searchQueries.$inferInsert;

// ════════════════════════════════════════════════════════════
// PLATFORMS
// ════════════════════════════════════════════════════════════

export const platforms = sqliteTable("platforms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").default("disconnected"),
  cookies: text("cookies"),
  auth_token: text("auth_token"),
  connected_at: text("connected_at"),
  last_checked_at: text("last_checked_at"),
  expires_at: text("expires_at"),
  error_message: text("error_message"),
  daily_limit: integer("daily_limit"),
  applied_today: integer("applied_today").default(0),
  limit_reset_at: text("limit_reset_at"),
});

export type PlatformRecord = typeof platforms.$inferSelect;
export type NewPlatformRecord = typeof platforms.$inferInsert;


// ════════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════════

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    status: text("status").default("queued"),
    payload: text("payload"),
    result: text("result"),
    error: text("error"),
    attempts: integer("attempts").default(0),
    max_attempts: integer("max_attempts").default(3),
    job_id: text("job_id").references(() => jobPostings.id, { onDelete: "set null" }),
    application_id: text("application_id").references(() => applications.id, { onDelete: "set null" }),
    parent_task_id: text("parent_task_id"),
    scheduled_for: text("scheduled_for").default(sql`(datetime('now'))`),
    started_at: text("started_at"),
    finished_at: text("finished_at"),
    priority: integer("priority").default(0),
    created_at: text("created_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_tasks_status").on(table.status, table.scheduled_for),
    index("idx_tasks_kind").on(table.kind),
  ],
);

export type TaskRecord = typeof tasks.$inferSelect;
export type NewTaskRecord = typeof tasks.$inferInsert;

// ════════════════════════════════════════════════════════════
// DOCUMENTS
// ════════════════════════════════════════════════════════════

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    profile_id: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    doc_type: text("doc_type").notNull(),
    display_name: text("display_name").notNull(),
    file_path: text("file_path").notNull(),
    file_format: text("file_format"),
    extracted_text: text("extracted_text"),
    parsed_structure: text("parsed_structure"),
    checksum: text("checksum"),
    size_bytes: integer("size_bytes"),
    origin: text("origin").default("uploaded"),
    source_job_id: text("source_job_id"),
    is_default: integer("is_default").default(0),
    created_at: text("created_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_documents_profile").on(table.profile_id),
    index("idx_documents_type").on(table.doc_type),
  ],
);

export type DocumentRecord = typeof documents.$inferSelect;
export type NewDocumentRecord = typeof documents.$inferInsert;

// ════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export type SettingRecord = typeof settings.$inferSelect;
export type NewSettingRecord = typeof settings.$inferInsert;


// ════════════════════════════════════════════════════════════
// AUTOMATION PLANS
// ════════════════════════════════════════════════════════════

export const automationPlans = sqliteTable("automation_plans", {
  id: text("id").primaryKey(),
  profile_id: text("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  steps: text("steps").default(sql`'[]'`),
  auto_apply: integer("auto_apply").default(0),
  min_match_score: integer("min_match_score").default(70),
  max_applies_per_run: integer("max_applies_per_run").default(10),
  run_interval_hours: integer("run_interval_hours").default(12),
  enabled: integer("enabled").default(1),
  last_run_at: text("last_run_at"),
  next_run_at: text("next_run_at"),
  total_runs: integer("total_runs").default(0),
  total_applied: integer("total_applied").default(0),
  created_at: text("created_at").default(sql`(datetime('now'))`),
  updated_at: text("updated_at").default(sql`(datetime('now'))`),
});

export type AutomationPlanRecord = typeof automationPlans.$inferSelect;
export type NewAutomationPlanRecord = typeof automationPlans.$inferInsert;

