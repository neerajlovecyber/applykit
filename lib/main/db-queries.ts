import { randomUUID } from "crypto";
import { getDb } from "./db";

// ─── Types ──────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  resume_path: string | null;
  resume_data: string | null;
  titles: string;
  locations: string;
  work_mode: string;
  salary_min: number | null;
  salary_max: number | null;
  industries: string;
  exclude_keywords: string;
  seniority: string;
  default_answers: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

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

export interface Platform {
  id: string;
  name: string | null;
  status: string;
  cookies: string | null;
  connected_at: string | null;
  expires_at: string | null;
}

export interface Setting {
  key: string;
  value: string;
}

// ─── Profiles ───────────────────────────────────────────

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
    INSERT INTO profiles (id, name, resume_path, resume_data, titles, locations, work_mode, salary_min, salary_max, industries, exclude_keywords, seniority, default_answers, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name ?? "New Profile",
    data.resume_path ?? null,
    data.resume_data ?? null,
    data.titles ?? "[]",
    data.locations ?? "[]",
    data.work_mode ?? "any",
    data.salary_min ?? null,
    data.salary_max ?? null,
    data.industries ?? "[]",
    data.exclude_keywords ?? "[]",
    data.seniority ?? "mid",
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

// ─── Jobs ───────────────────────────────────────────────

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

// ─── History ────────────────────────────────────────────

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

// ─── Platforms ──────────────────────────────────────────

export function getPlatforms(): Platform[] {
  return getDb().prepare("SELECT * FROM platforms ORDER BY name").all() as Platform[];
}

export function getPlatformById(id: string): Platform | undefined {
  return getDb().prepare("SELECT * FROM platforms WHERE id = ?").get(id) as Platform | undefined;
}

export function updatePlatformStatus(id: string, status: string, cookies?: string): void {
  const connectedAt = status === "connected" ? new Date().toISOString() : null;
  getDb().prepare("UPDATE platforms SET status = ?, cookies = ?, connected_at = ? WHERE id = ?")
    .run(status, cookies ?? null, connectedAt, id);
}

// ─── Settings ───────────────────────────────────────────

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
