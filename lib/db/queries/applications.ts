import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { applications, type ApplicationRecord, type NewApplicationRecord } from "../schema";

export function getApplications(filters?: {
  status?: string;
  outcome?: string;
  profileId?: string;
  limit?: number;
}): ApplicationRecord[] {
  const db = getDrizzleDb();
  const conditions: SQL[] = [];

  if (filters?.status) {
    conditions.push(eq(applications.status, filters.status));
  }
  if (filters?.outcome) {
    conditions.push(eq(applications.outcome, filters.outcome));
  }
  if (filters?.profileId) {
    conditions.push(eq(applications.profile_id, filters.profileId));
  }

  let query = db.select().from(applications);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  query = query.orderBy(desc(applications.created_at)) as typeof query;

  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }

  return query.all();
}

export function getApplicationById(id: string): ApplicationRecord | undefined {
  return getDrizzleDb().select().from(applications).where(eq(applications.id, id)).get();
}

export function getApplicationByJobId(jobId: string): ApplicationRecord | undefined {
  return getDrizzleDb()
    .select()
    .from(applications)
    .where(eq(applications.job_id, jobId))
    .orderBy(desc(applications.created_at))
    .limit(1)
    .get();
}

export function createApplication(data: {
  job_id: string;
  profile_id: string;
  status?: string;
  resume_version?: string;
  cover_letter?: string;
}): ApplicationRecord {
  const id = randomUUID();
  const initialHistory = JSON.stringify([
    { from: null, to: data.status ?? "pending_review", at: new Date().toISOString(), reason: "created" },
  ]);

  const newRecord: NewApplicationRecord = {
    id,
    job_id: data.job_id,
    profile_id: data.profile_id,
    status: data.status ?? "pending_review",
    resume_version: data.resume_version ?? null,
    cover_letter: data.cover_letter ?? null,
    state_history: initialHistory,
  };

  getDrizzleDb().insert(applications).values(newRecord).run();
  return getApplicationById(id)!;
}

export function updateApplicationStatus(id: string, status: string, reason?: string): void {
  const db = getDrizzleDb();
  const app = getApplicationById(id);
  if (!app) return;

  const history = JSON.parse(app.state_history || "[]");
  history.push({ from: app.status, to: status, at: new Date().toISOString(), reason: reason ?? null });

  const submittedAt = status === "submitted" ? new Date().toISOString() : app.submitted_at;

  db.update(applications)
    .set({
      status,
      state_history: JSON.stringify(history),
      submitted_at: submittedAt,
      updated_at: new Date().toISOString(),
    })
    .where(eq(applications.id, id))
    .run();
}

export function updateApplicationOutcome(id: string, outcome: string, note?: string): void {
  getDrizzleDb()
    .update(applications)
    .set({
      outcome,
      outcome_note: note ?? null,
      outcome_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(applications.id, id))
    .run();
}

export function updateApplicationMaterials(id: string, data: {
  resume_version?: string;
  cover_letter?: string;
  qa_responses?: string;
}): void {
  const db = getDrizzleDb();
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.resume_version !== undefined) updateData.resume_version = data.resume_version;
  if (data.cover_letter !== undefined) updateData.cover_letter = data.cover_letter;
  if (data.qa_responses !== undefined) updateData.qa_responses = data.qa_responses;

  db.update(applications)
    .set(updateData)
    .where(eq(applications.id, id))
    .run();
}

export function updateApplicationFillDetails(id: string, data: {
  fields_filled: number;
  fields_total: number;
  fill_details?: string;
  screenshot_path?: string;
}): void {
  const db = getDrizzleDb();
  const updateData: Record<string, unknown> = {
    fields_filled: data.fields_filled,
    fields_total: data.fields_total,
    updated_at: new Date().toISOString(),
  };
  if (data.fill_details !== undefined) updateData.fill_details = data.fill_details;
  if (data.screenshot_path !== undefined) updateData.screenshot_path = data.screenshot_path;

  db.update(applications)
    .set(updateData)
    .where(eq(applications.id, id))
    .run();
}

export function clearApplicationHistory(profileId?: string): void {
  const db = getDrizzleDb();
  if (profileId) {
    db.delete(applications).where(eq(applications.profile_id, profileId)).run();
  } else {
    db.delete(applications).run();
  }
}

export function getApplicationsWithJobs(profileId?: string): (ApplicationRecord & {
  title: string;
  company: string;
  location: string | null;
  platform: string;
  application_url: string | null;
})[] {
  const db = getDrizzleDb();
  const query = profileId
    ? sql`
      SELECT 
        a.*,
        COALESCE(j.title, 'Untitled Role') as title,
        COALESCE(j.company, 'Unknown Company') as company,
        j.location,
        COALESCE(j.source, 'linkedin') as platform,
        j.application_url
      FROM applications a
      LEFT JOIN job_postings j ON (a.job_id = j.id OR a.job_id = j.source_id)
      WHERE a.profile_id = ${profileId}
      ORDER BY a.created_at DESC
    `
    : sql`
      SELECT 
        a.*,
        COALESCE(j.title, 'Untitled Role') as title,
        COALESCE(j.company, 'Unknown Company') as company,
        j.location,
        COALESCE(j.source, 'linkedin') as platform,
        j.application_url
      FROM applications a
      LEFT JOIN job_postings j ON (a.job_id = j.id OR a.job_id = j.source_id)
      ORDER BY a.created_at DESC
    `;

  return db.all(query) as any;
}

export function getApplicationStats(): {
  total: number;
  pending: number;
  approved: number;
  submitted: number;
  failed: number;
} {
  const db = getDrizzleDb();
  const countStatus = (statusVal?: string) => {
    const q = statusVal
      ? db.select({ count: sql<number>`count(*)` }).from(applications).where(eq(applications.status, statusVal)).get()
      : db.select({ count: sql<number>`count(*)` }).from(applications).get();
    return q?.count ?? 0;
  };

  return {
    total: countStatus(),
    pending: countStatus("pending_review"),
    approved: countStatus("approved"),
    submitted: countStatus("submitted"),
    failed: countStatus("failed"),
  };
}

