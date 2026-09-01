import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { jobs, history, type JobRecord, type NewJobRecord, type HistoryRecord, type NewHistoryRecord } from "../schema";

export function getJobs(status?: string): JobRecord[] {
  const db = getDrizzleDb();
  if (status) {
    return db.select().from(jobs).where(eq(jobs.status, status)).orderBy(desc(jobs.added_at)).all();
  }
  return db.select().from(jobs).orderBy(desc(jobs.added_at)).all();
}

export function getJobById(id: string): JobRecord | undefined {
  return getDrizzleDb().select().from(jobs).where(eq(jobs.id, id)).get();
}

export function addJob(data: {
  title: string;
  company?: string;
  url: string;
  platform?: string;
  profile_id?: string;
}): JobRecord {
  const id = randomUUID();
  const db = getDrizzleDb();

  const newRecord: NewJobRecord = {
    id,
    title: data.title,
    company: data.company ?? null,
    url: data.url,
    platform: data.platform ?? null,
    profile_id: data.profile_id ?? null,
    status: "queued",
    added_at: new Date().toISOString(),
  };

  db.insert(jobs).values(newRecord).run();
  return getJobById(id)!;
}

export function updateJobStatus(id: string, status: string, errorMessage?: string): void {
  getDrizzleDb()
    .update(jobs)
    .set({
      status,
      error_message: errorMessage ?? null,
      applied_at: status === "applied" ? new Date().toISOString() : undefined,
    })
    .where(eq(jobs.id, id))
    .run();
}

export function deleteJob(id: string): void {
  getDrizzleDb().delete(jobs).where(eq(jobs.id, id)).run();
}

export function getHistory(status?: string): HistoryRecord[] {
  const db = getDrizzleDb();
  if (status) {
    return db.select().from(history).where(eq(history.status, status)).orderBy(desc(history.applied_at)).all();
  }
  return db.select().from(history).orderBy(desc(history.applied_at)).all();
}

export function addHistoryEntry(data: {
  job_id?: string;
  title?: string;
  company?: string;
  platform?: string;
  url?: string;
  profile_id?: string;
  profile_name?: string;
  status: string;
  error_message?: string;
}): HistoryRecord {
  const id = randomUUID();
  const db = getDrizzleDb();

  const newRecord: NewHistoryRecord = {
    id,
    job_id: data.job_id ?? null,
    title: data.title ?? "Untitled Role",
    company: data.company ?? null,
    platform: data.platform ?? null,
    url: data.url ?? null,
    profile_id: data.profile_id ?? null,
    profile_name: data.profile_name ?? null,
    status: data.status,
    error_message: data.error_message ?? null,
    applied_at: new Date().toISOString(),
  };

  db.insert(history).values(newRecord).run();
  return db.select().from(history).where(eq(history.id, id)).get()!;
}

export function clearHistory(): void {
  getDrizzleDb().delete(history).run();
}

export const removeJob = deleteJob;

export function clearCompletedJobs(): void {
  getDrizzleDb().delete(jobs).where(eq(jobs.status, "applied")).run();
}

export function getQueueStats(): { queued: number; applied: number; failed: number } {
  const allJobs = getJobs();
  return {
    queued: allJobs.filter((j) => j.status === "queued").length,
    applied: allJobs.filter((j) => j.status === "applied").length,
    failed: allJobs.filter((j) => j.status === "failed").length,
  };
}

export function getHistoryStats(): { total: number; applied: number; failed: number; todayCount: number; weekCount: number } {
  const allHistory = getHistory();
  const today = new Date().toISOString().slice(0, 10);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    total: allHistory.length,
    applied: allHistory.filter((h) => h.status === "applied").length,
    failed: allHistory.filter((h) => h.status === "failed").length,
    todayCount: allHistory.filter((h) => h.applied_at?.startsWith(today)).length,
    weekCount: allHistory.filter((h) => (h.applied_at ? h.applied_at >= oneWeekAgo : false)).length,
  };
}

