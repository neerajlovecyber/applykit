import { eq, and, gte, desc, sql, type SQL } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { jobPostings, type JobPostingRecord, type NewJobPostingRecord } from "../schema";

export function getJobPostings(filters?: {
  state?: string;
  source?: string;
  minScore?: number;
  limit?: number;
  offset?: number;
}): JobPostingRecord[] {
  const db = getDrizzleDb();
  const conditions: SQL[] = [];

  if (filters?.state) {
    conditions.push(eq(jobPostings.state, filters.state));
  }
  if (filters?.source) {
    conditions.push(eq(jobPostings.source, filters.source));
  }
  if (filters?.minScore !== undefined) {
    conditions.push(gte(jobPostings.match_score, filters.minScore));
  }

  let query = db.select().from(jobPostings);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  query = query.orderBy(desc(jobPostings.discovered_at)) as typeof query;

  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }

  return query.all();
}

export function getJobPostingById(id: string): JobPostingRecord | undefined {
  return getDrizzleDb().select().from(jobPostings).where(eq(jobPostings.id, id)).get();
}

export function getJobPostingBySourceId(source: string, sourceId: string): JobPostingRecord | undefined {
  return getDrizzleDb()
    .select()
    .from(jobPostings)
    .where(and(eq(jobPostings.source, source), eq(jobPostings.source_id, sourceId)))
    .get();
}

export function upsertJobPosting(data: Partial<NewJobPostingRecord> & { source: string; source_id: string; title: string; company: string }): JobPostingRecord {
  const db = getDrizzleDb();
  let existing = getJobPostingBySourceId(data.source, data.source_id);

  if (!existing && data.title && data.company) {
    existing = db
      .select()
      .from(jobPostings)
      .where(
        and(
          eq(jobPostings.source, data.source),
          sql`LOWER(${jobPostings.title}) = LOWER(${data.title})`,
          sql`LOWER(${jobPostings.company}) = LOWER(${data.company})`,
        ),
      )
      .get();
  }

  if (existing) {
    db.update(jobPostings)
      .set({
        title: data.title,
        company: data.company,
        location: data.location ?? null,
        employment_type: data.employment_type ?? null,
        seniority: data.seniority ?? null,
        description: data.description ?? null,
        requirements: data.requirements ?? null,
        salary_info: data.salary_info ?? null,
        application_url: data.application_url ?? null,
        company_url: data.company_url ?? null,
        raw_data: data.raw_data ?? null,
        content_hash: data.content_hash ?? null,
        last_seen_at: new Date().toISOString(),
      })
      .where(eq(jobPostings.id, existing.id))
      .run();

    return getJobPostingById(existing.id)!;
  }

  const id = data.id || randomUUID();
  const record: NewJobPostingRecord = {
    id,
    source: data.source,
    source_id: data.source_id,
    title: data.title,
    company: data.company,
    location: data.location ?? null,
    employment_type: data.employment_type ?? null,
    seniority: data.seniority ?? null,
    description: data.description ?? null,
    requirements: data.requirements ?? null,
    salary_info: data.salary_info ?? null,
    application_url: data.application_url ?? null,
    company_url: data.company_url ?? null,
    raw_data: data.raw_data ?? null,
    content_hash: data.content_hash ?? null,
  };

  db.insert(jobPostings).values(record).run();
  return getJobPostingById(id)!;
}

export function updateJobPostingState(id: string, state: string): void {
  getDrizzleDb().update(jobPostings).set({ state }).where(eq(jobPostings.id, id)).run();
}

export function updateJobPostingScore(
  id: string,
  score: number,
  breakdown?: string,
  explanation?: string,
): void {
  getDrizzleDb()
    .update(jobPostings)
    .set({
      match_score: score,
      match_breakdown: breakdown ?? null,
      match_explanation: explanation ?? null,
    })
    .where(eq(jobPostings.id, id))
    .run();
}

export function getJobPostingStats(): {
  total: number;
  new: number;
  scored: number;
  queued: number;
  applied: number;
  skipped: number;
} {
  const db = getDrizzleDb();
  const countState = (stateVal?: string) => {
    const q = stateVal
      ? db.select({ count: sql<number>`count(*)` }).from(jobPostings).where(eq(jobPostings.state, stateVal)).get()
      : db.select({ count: sql<number>`count(*)` }).from(jobPostings).get();
    return q?.count ?? 0;
  };

  return {
    total: countState(),
    new: countState("new"),
    scored: countState("scored"),
    queued: countState("queued"),
    applied: countState("applied"),
    skipped: countState("skipped"),
  };
}
