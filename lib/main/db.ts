import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = join(app.getPath("userData"), "applykit.db");
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initTables(db);
  return db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    -- ════════════════════════════════════════════════════════════
    -- PROFILES: User profiles with full personal & preference data
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS profiles (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      -- Personal Info
      full_name         TEXT,
      email             TEXT,
      phone             TEXT,
      location          TEXT,
      linkedin_url      TEXT,
      portfolio_url     TEXT,
      -- Professional Summary
      summary           TEXT,
      skills            TEXT DEFAULT '[]',
      experience_years  INTEGER,
      seniority         TEXT DEFAULT 'mid',
      -- Job Preferences
      target_titles     TEXT DEFAULT '[]',
      target_locations  TEXT DEFAULT '[]',
      work_mode         TEXT DEFAULT 'any',
      salary_min        INTEGER,
      salary_max        INTEGER,
      salary_currency   TEXT DEFAULT 'INR',
      target_industries TEXT DEFAULT '[]',
      -- Search Filters
      exclude_companies TEXT DEFAULT '[]',
      exclude_keywords  TEXT DEFAULT '[]',
      min_company_size  TEXT,
      visa_required     INTEGER DEFAULT 0,
      -- Resume & Documents
      resume_path       TEXT,
      resume_data       TEXT,
      resume_parsed     TEXT,
      cover_letter_template TEXT,
      -- Default Answers
      default_answers   TEXT DEFAULT '{}',
      -- Meta
      is_active         INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    );

    -- ════════════════════════════════════════════════════════════
    -- QA BANK: Learned question-answer pairs
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS qa_bank (
      id                TEXT PRIMARY KEY,
      profile_id        TEXT NOT NULL,
      question_pattern  TEXT NOT NULL,
      question_type     TEXT,
      answer            TEXT NOT NULL,
      variants          TEXT DEFAULT '[]',
      confidence        TEXT DEFAULT 'high',
      source            TEXT DEFAULT 'manual',
      use_count         INTEGER DEFAULT 0,
      last_used_at      TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_qa_bank_profile ON qa_bank(profile_id);
    CREATE INDEX IF NOT EXISTS idx_qa_bank_pattern ON qa_bank(question_pattern);

    -- ════════════════════════════════════════════════════════════
    -- JOB POSTINGS: Discovered & tracked jobs
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS job_postings (
      id                TEXT PRIMARY KEY,
      source            TEXT NOT NULL,
      source_id         TEXT NOT NULL,
      title             TEXT NOT NULL,
      company           TEXT NOT NULL,
      location          TEXT,
      employment_type   TEXT,
      seniority         TEXT,
      description       TEXT,
      requirements      TEXT,
      salary_info       TEXT,
      application_url   TEXT,
      company_url       TEXT,
      -- Scoring
      match_score       REAL,
      match_breakdown   TEXT,
      match_explanation TEXT,
      -- State
      state             TEXT DEFAULT 'new',
      -- Tracking
      discovered_at     TEXT DEFAULT (datetime('now')),
      last_seen_at      TEXT DEFAULT (datetime('now')),
      expires_at        TEXT,
      -- Raw
      raw_data          TEXT,
      content_hash      TEXT,
      UNIQUE(source, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_job_postings_state ON job_postings(state);
    CREATE INDEX IF NOT EXISTS idx_job_postings_company ON job_postings(company);
    CREATE INDEX IF NOT EXISTS idx_job_postings_score ON job_postings(match_score DESC);
    CREATE INDEX IF NOT EXISTS idx_job_postings_discovered ON job_postings(discovered_at DESC);
    CREATE INDEX IF NOT EXISTS idx_job_postings_source ON job_postings(source, source_id);

    -- ════════════════════════════════════════════════════════════
    -- APPLICATIONS: Submission tracking
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS applications (
      id                TEXT PRIMARY KEY,
      job_id            TEXT NOT NULL,
      profile_id        TEXT NOT NULL,
      status            TEXT DEFAULT 'pending_review',
      -- Materials
      resume_version    TEXT,
      cover_letter      TEXT,
      qa_responses      TEXT,
      -- Fill details
      fields_filled     INTEGER,
      fields_total      INTEGER,
      fill_details      TEXT,
      screenshot_path   TEXT,
      -- Outcome
      outcome           TEXT,
      outcome_note      TEXT,
      outcome_updated_at TEXT,
      -- Audit
      state_history     TEXT DEFAULT '[]',
      error_log         TEXT,
      -- Timestamps
      created_at        TEXT DEFAULT (datetime('now')),
      submitted_at      TEXT,
      updated_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES job_postings(id),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_applications_outcome ON applications(outcome);

    -- ════════════════════════════════════════════════════════════
    -- SEARCH QUERIES: Saved searches
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS search_queries (
      id                TEXT PRIMARY KEY,
      profile_id        TEXT NOT NULL,
      source            TEXT NOT NULL,
      keywords          TEXT NOT NULL,
      location          TEXT,
      filters           TEXT DEFAULT '{}',
      status            TEXT DEFAULT 'active',
      last_run_at       TEXT,
      last_success_at   TEXT,
      result_count      INTEGER DEFAULT 0,
      max_pages         INTEGER DEFAULT 3,
      run_interval_hours INTEGER DEFAULT 24,
      next_run_at       TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_search_queries_profile ON search_queries(profile_id);
    CREATE INDEX IF NOT EXISTS idx_search_queries_status ON search_queries(status);

    -- ════════════════════════════════════════════════════════════
    -- PLATFORMS: Login state for each platform
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS platforms (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      status            TEXT DEFAULT 'disconnected',
      cookies           TEXT,
      auth_token        TEXT,
      connected_at      TEXT,
      last_checked_at   TEXT,
      expires_at        TEXT,
      error_message     TEXT,
      daily_limit       INTEGER,
      applied_today     INTEGER DEFAULT 0,
      limit_reset_at    TEXT
    );

    -- ════════════════════════════════════════════════════════════
    -- TASKS: Background task queue
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS tasks (
      id                TEXT PRIMARY KEY,
      kind              TEXT NOT NULL,
      status            TEXT DEFAULT 'queued',
      payload           TEXT,
      result            TEXT,
      error             TEXT,
      attempts          INTEGER DEFAULT 0,
      max_attempts      INTEGER DEFAULT 3,
      job_id            TEXT,
      application_id    TEXT,
      parent_task_id    TEXT,
      scheduled_for     TEXT DEFAULT (datetime('now')),
      started_at        TEXT,
      finished_at       TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE SET NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_tasks_kind ON tasks(kind);

    -- ════════════════════════════════════════════════════════════
    -- DOCUMENTS: Resume & cover letter library
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS documents (
      id                TEXT PRIMARY KEY,
      profile_id        TEXT NOT NULL,
      doc_type          TEXT NOT NULL,
      display_name      TEXT NOT NULL,
      file_path         TEXT NOT NULL,
      file_format       TEXT,
      extracted_text    TEXT,
      parsed_structure  TEXT,
      checksum          TEXT,
      size_bytes        INTEGER,
      origin            TEXT DEFAULT 'uploaded',
      source_job_id     TEXT,
      is_default        INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_profile ON documents(profile_id);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);

    -- ════════════════════════════════════════════════════════════
    -- SETTINGS: Key-value app settings
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS settings (
      key               TEXT PRIMARY KEY,
      value             TEXT
    );

    -- ════════════════════════════════════════════════════════════
    -- AUTOMATION PLANS: Scheduled automation workflows
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS automation_plans (
      id                TEXT PRIMARY KEY,
      profile_id        TEXT NOT NULL,
      name              TEXT NOT NULL,
      steps             TEXT NOT NULL,
      auto_apply        INTEGER DEFAULT 0,
      min_match_score   REAL DEFAULT 0.7,
      max_applies_per_run INTEGER DEFAULT 10,
      enabled           INTEGER DEFAULT 1,
      run_interval_hours INTEGER DEFAULT 24,
      last_run_at       TEXT,
      next_run_at       TEXT,
      total_runs        INTEGER DEFAULT 0,
      total_applied     INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_automation_plans_profile ON automation_plans(profile_id);

    -- ════════════════════════════════════════════════════════════
    -- LEGACY COMPAT: Keep old 'jobs' and 'history' tables for backward compat
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT,
      url TEXT NOT NULL,
      platform TEXT,
      status TEXT DEFAULT 'queued',
      profile_id TEXT,
      error_message TEXT,
      added_at TEXT DEFAULT (datetime('now')),
      applied_at TEXT,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      title TEXT,
      company TEXT,
      platform TEXT,
      url TEXT,
      profile_id TEXT,
      profile_name TEXT,
      status TEXT,
      error_message TEXT,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default platform entries if they don't exist
  const platformInsert = db.prepare(
    "INSERT OR IGNORE INTO platforms (id, name) VALUES (?, ?)",
  );
  const defaultPlatforms = [
    ["linkedin", "LinkedIn"],
    ["naukri", "Naukri"],
    ["indeed", "Indeed"],
    ["lever", "Lever"],
    ["greenhouse", "Greenhouse"],
    ["workday", "Workday"],
  ];
  for (const [id, name] of defaultPlatforms) {
    platformInsert.run(id, name);
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
