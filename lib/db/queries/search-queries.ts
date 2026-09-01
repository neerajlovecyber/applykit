import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { searchQueries, type SearchQueryRecord, type NewSearchQueryRecord } from "../schema";

export function getSearchQueries(profileId?: string): SearchQueryRecord[] {
  const db = getDrizzleDb();
  if (profileId) {
    return db
      .select()
      .from(searchQueries)
      .where(eq(searchQueries.profile_id, profileId))
      .orderBy(desc(searchQueries.created_at))
      .all();
  }
  return db.select().from(searchQueries).orderBy(desc(searchQueries.created_at)).all();
}

export function getSearchQueryById(id: string): SearchQueryRecord | undefined {
  return getDrizzleDb().select().from(searchQueries).where(eq(searchQueries.id, id)).get();
}

export function createSearchQuery(data: {
  profile_id: string;
  source: string;
  keywords: string;
  location?: string;
  filters?: Record<string, unknown> | string;
  max_pages?: number;
  run_interval_hours?: number;
}): SearchQueryRecord {
  const id = randomUUID();
  const db = getDrizzleDb();

  const filtersObj =
    typeof data.filters === "string"
      ? (() => {
          try {
            return JSON.parse(data.filters);
          } catch {
            return {};
          }
        })()
      : data.filters ?? {};

  const newRecord: NewSearchQueryRecord = {
    id,
    profile_id: data.profile_id,
    source: data.source,
    keywords: data.keywords,
    location: data.location ?? null,
    filters: JSON.stringify(filtersObj),
    status: "active",
    max_pages: data.max_pages ?? 3,
    run_interval_hours: data.run_interval_hours ?? 24,
    result_count: 0,
    created_at: new Date().toISOString(),
  };

  db.insert(searchQueries).values(newRecord).run();
  return getSearchQueryById(id)!;
}

export function updateSearchQueryStatus(id: string, status: string): void {
  getDrizzleDb().update(searchQueries).set({ status }).where(eq(searchQueries.id, id)).run();
}

export function updateSearchQueryLastRun(id: string, resultCount: number, success: boolean): void {
  const now = new Date().toISOString();
  const query = getSearchQueryById(id);
  if (!query) return;

  const hours = query.run_interval_hours || 24;
  const nextRun = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  getDrizzleDb()
    .update(searchQueries)
    .set({
      last_run_at: now,
      last_success_at: success ? now : query.last_success_at,
      result_count: resultCount,
      next_run_at: nextRun,
    })
    .where(eq(searchQueries.id, id))
    .run();
}

export function deleteSearchQuery(id: string): void {
  getDrizzleDb().delete(searchQueries).where(eq(searchQueries.id, id)).run();
}
