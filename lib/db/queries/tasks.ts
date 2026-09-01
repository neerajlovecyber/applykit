import { eq, and, lte, desc, asc, type SQL } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { tasks, type TaskRecord, type NewTaskRecord } from "../schema";

export function getTasks(filters?: {
  kind?: string;
  status?: string;
  limit?: number;
}): TaskRecord[] {
  const db = getDrizzleDb();
  const conditions: SQL[] = [];

  if (filters?.kind) {
    conditions.push(eq(tasks.kind, filters.kind));
  }
  if (filters?.status) {
    conditions.push(eq(tasks.status, filters.status));
  }

  let query = db.select().from(tasks);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  query = query.orderBy(desc(tasks.scheduled_for)) as typeof query;

  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }

  return query.all();
}

export function getTaskById(id: string): TaskRecord | undefined {
  return getDrizzleDb().select().from(tasks).where(eq(tasks.id, id)).get();
}

export function createTask(data: {
  kind: string;
  payload?: string;
  job_id?: string;
  application_id?: string;
  parent_task_id?: string;
  scheduled_for?: string;
  max_attempts?: number;
  priority?: number;
}): TaskRecord {
  const id = randomUUID();
  const db = getDrizzleDb();

  const newRecord: NewTaskRecord = {
    id,
    kind: data.kind,
    status: "queued",
    payload: data.payload ?? null,
    job_id: data.job_id ?? null,
    application_id: data.application_id ?? null,
    parent_task_id: data.parent_task_id ?? null,
    scheduled_for: data.scheduled_for ?? new Date().toISOString(),
    max_attempts: data.max_attempts ?? 3,
    priority: data.priority ?? 0,
    attempts: 0,
  };

  db.insert(tasks).values(newRecord).run();
  return getTaskById(id)!;
}

export function getNextPendingTask(): TaskRecord | undefined {
  const db = getDrizzleDb();
  const now = new Date().toISOString();

  // Find next queued task scheduled before now, ordered by priority DESC, scheduled_for ASC
  const task = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, "queued"), lte(tasks.scheduled_for, now)))
    .orderBy(desc(tasks.priority), asc(tasks.scheduled_for))
    .limit(1)
    .get();

  return task;
}

export function updateTaskStatus(
  id: string,
  status: string,
  result?: string,
  error?: string,
): void {
  const db = getDrizzleDb();
  const current = getTaskById(id);
  if (!current) return;

  const updateData: Record<string, unknown> = {
    status,
  };

  if (status === "running") {
    updateData.started_at = new Date().toISOString();
    updateData.attempts = (current.attempts || 0) + 1;
  } else if (status === "succeeded" || status === "failed") {
    updateData.finished_at = new Date().toISOString();
  }

  if (result !== undefined) updateData.result = result;
  if (error !== undefined) updateData.error = error;

  db.update(tasks).set(updateData).where(eq(tasks.id, id)).run();
}

export function cleanupFinishedTasks(olderThanDays = 7): void {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
  getDrizzleDb().delete(tasks).where(and(eq(tasks.status, "completed"), lte(tasks.finished_at, cutoff))).run();
}

export function getTaskStats(): { total: number; queued: number; running: number; completed: number; failed: number } {
  const allTasks = getTasks();
  return {
    total: allTasks.length,
    queued: allTasks.filter((t) => t.status === "queued").length,
    running: allTasks.filter((t) => t.status === "running").length,
    completed: allTasks.filter((t) => t.status === "completed").length,
    failed: allTasks.filter((t) => t.status === "failed").length,
  };
}

