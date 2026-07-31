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
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      resume_path TEXT,
      resume_data TEXT,
      titles TEXT DEFAULT '[]',
      locations TEXT DEFAULT '[]',
      work_mode TEXT DEFAULT 'any',
      salary_min INTEGER,
      salary_max INTEGER,
      industries TEXT DEFAULT '[]',
      exclude_keywords TEXT DEFAULT '[]',
      seniority TEXT DEFAULT 'mid',
      default_answers TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS platforms (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT DEFAULT 'disconnected',
      cookies TEXT,
      connected_at TEXT,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default platform entries if they don't exist
  const platformInsert = db.prepare(
    "INSERT OR IGNORE INTO platforms (id, name) VALUES (?, ?)",
  );
  const defaultPlatforms = [
    ["linkedin", "LinkedIn"],
    ["lever", "Lever"],
    ["greenhouse", "Greenhouse"],
    ["workday", "Workday"],
    ["indeed", "Indeed"],
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
