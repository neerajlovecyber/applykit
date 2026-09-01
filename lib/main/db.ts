import type Database from "better-sqlite3";
import { join } from "path";
import os from "os";
import fs from "fs";

let db: any = null;

function createSqliteConnection(dbPath: string): any {
  if (typeof (process.versions as any).bun !== "undefined") {
    const { Database } = require("bun:sqlite");
    return new Database(dbPath);
  }
  const Database = require("better-sqlite3");
  return new Database(dbPath);
}

export function resolveDbPath(): string {
  if (process.env.APPLYKIT_DB_PATH) {
    return process.env.APPLYKIT_DB_PATH;
  }
  try {
    const electron = require("electron");
    if (electron?.app && typeof electron.app.getPath === "function") {
      return join(electron.app.getPath("userData"), "applykit.db");
    }
  } catch {}
  return join(os.homedir(), ".applykit", "applykit.db");
}

export function getDb(customPath?: string): any {
  if (db && !customPath) return db;

  const dbPath = customPath || resolveDbPath();
  if (dbPath !== ":memory:") {
    const dir = join(dbPath, "..");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const instance = createSqliteConnection(dbPath);

  // Enable WAL mode for better concurrent read performance
  if (dbPath !== ":memory:") {
    try {
      if (instance.pragma) instance.pragma("journal_mode = WAL");
      else instance.exec("PRAGMA journal_mode = WAL;");
    } catch {}
  }
  try {
    if (instance.pragma) instance.pragma("foreign_keys = ON");
    else instance.exec("PRAGMA foreign_keys = ON;");
  } catch {}

  initSchema(instance);

  if (!customPath) {
    db = instance;
  }
  return instance;
}

export function setDb(customDb: any): void {
  db = customDb;
}

export function closeDb(): void {
  if (db) {
    try {
      db.close();
    } catch {}
    db = null;
  }
}

/**
 * Initializes table schemas matching Drizzle ORM models if not yet present.
 */
function initSchema(sqlite: any): void {
  const ddl = `
    CREATE TABLE IF NOT EXISTS profiles (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      full_name         TEXT,
      email             TEXT,
      phone             TEXT,
      location          TEXT,
      linkedin_url      TEXT,
      portfolio_url     TEXT,
      summary           TEXT,
      skills            TEXT DEFAULT '[]',
      experience_years  INTEGER,
      seniority         TEXT DEFAULT 'mid',
      target_titles     TEXT DEFAULT '[]',
      target_locations  TEXT DEFAULT '[]',
      work_mode         TEXT DEFAULT 'any',
      salary_min        INTEGER,
      salary_max        INTEGER,
      salary_currency   TEXT DEFAULT 'INR',
      target_industries TEXT DEFAULT '[]',
      exclude_companies TEXT DEFAULT '[]',
      exclude_keywords  TEXT DEFAULT '[]',
      min_company_size  TEXT,
      visa_required     INTEGER DEFAULT 0,
      resume_path       TEXT,
      resume_data       TEXT,
      resume_parsed     TEXT,
      cover_letter_template TEXT,
      default_answers   TEXT DEFAULT '{}',
      notice_period     TEXT DEFAULT '30 days',
      is_active         INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    );

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
      match_score       REAL,
      match_breakdown   TEXT,
      match_explanation TEXT,
      state             TEXT DEFAULT 'new',
      discovered_at     TEXT DEFAULT (datetime('now')),
      last_seen_at      TEXT DEFAULT (datetime('now')),
      expires_at        TEXT,
      raw_data          TEXT,
      content_hash      TEXT,
      UNIQUE(source, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_job_postings_state ON job_postings(state);
    CREATE INDEX IF NOT EXISTS idx_job_postings_score ON job_postings(match_score DESC);

    CREATE TABLE IF NOT EXISTS applications (
      id                TEXT PRIMARY KEY,
      job_id            TEXT NOT NULL,
      profile_id        TEXT NOT NULL,
      status            TEXT DEFAULT 'pending_review',
      resume_version    TEXT,
      cover_letter      TEXT,
      qa_responses      TEXT,
      fields_filled     INTEGER,
      fields_total      INTEGER,
      fill_details      TEXT,
      screenshot_path   TEXT,
      outcome           TEXT,
      outcome_note      TEXT,
      outcome_updated_at TEXT,
      state_history     TEXT DEFAULT '[]',
      error_log         TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      submitted_at      TEXT,
      updated_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES job_postings(id),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_applications_profile ON applications(profile_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

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
      priority          INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE SET NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority DESC, scheduled_for ASC);

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

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS automation_plans (
      id                  TEXT PRIMARY KEY,
      profile_id          TEXT NOT NULL,
      name                TEXT NOT NULL,
      steps               TEXT DEFAULT '[]',
      auto_apply          INTEGER DEFAULT 0,
      min_match_score     INTEGER DEFAULT 70,
      max_applies_per_run INTEGER DEFAULT 10,
      run_interval_hours  INTEGER DEFAULT 12,
      enabled             INTEGER DEFAULT 1,
      last_run_at         TEXT,
      next_run_at         TEXT,
      total_runs          INTEGER DEFAULT 0,
      total_applied       INTEGER DEFAULT 0,
      created_at          TEXT DEFAULT (datetime('now')),
      updated_at          TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      company       TEXT,
      url           TEXT NOT NULL,
      platform      TEXT,
      status        TEXT DEFAULT 'pending',
      error_message TEXT,
      profile_id    TEXT,
      added_at      TEXT DEFAULT (datetime('now')),
      applied_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS history (
      id            TEXT PRIMARY KEY,
      job_id        TEXT,
      title         TEXT NOT NULL,
      company       TEXT,
      platform      TEXT,
      url           TEXT,
      profile_id    TEXT,
      profile_name  TEXT,
      status        TEXT NOT NULL,
      error_message TEXT,
      applied_at    TEXT DEFAULT (datetime('now'))
    );
  `;

  sqlite.exec(ddl);
}
