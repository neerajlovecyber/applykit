/**
 * Database Persistence Module (Unified Drizzle ORM + SQLite).
 *
 * Consolidates connection management, Drizzle client lifecycle,
 * table schemas, and typed query operations behind the @/lib/db seam.
 */

import * as schema from "./schema";
import { getDb } from "./connection";

let drizzleInstance: any = null;

/**
 * Get the typed Drizzle ORM database instance wrapping SQLite.
 */
export function getDrizzleDb(): any {
  if (drizzleInstance) return drizzleInstance;

  const sqlite = getDb();

  if (typeof (process.versions as any).bun !== "undefined") {
    const { drizzle } = require("drizzle-orm/bun-sqlite");
    drizzleInstance = drizzle({ client: sqlite, schema });
    return drizzleInstance;
  }

  const { drizzle } = require("drizzle-orm/better-sqlite3");
  drizzleInstance = drizzle(sqlite, { schema });
  return drizzleInstance;
}

/**
 * Helper to initialize or re-bind Drizzle to an explicit SQLite instance (useful for testing).
 */
export function createDrizzleClient(sqlite: any): any {
  if (typeof (process.versions as any).bun !== "undefined") {
    const { drizzle } = require("drizzle-orm/bun-sqlite");
    return drizzle({ client: sqlite, schema });
  }
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  return drizzle(sqlite, { schema });
}

/**
 * Explicitly set the global Drizzle instance (e.g. for testing with in-memory DB).
 */
export function initDrizzleDb(clientOrSqlite: any): any {
  if (clientOrSqlite && (clientOrSqlite.select || clientOrSqlite.query)) {
    drizzleInstance = clientOrSqlite;
  } else if (typeof (process.versions as any).bun !== "undefined") {
    const { drizzle } = require("drizzle-orm/bun-sqlite");
    drizzleInstance = drizzle({ client: clientOrSqlite, schema });
  } else {
    const { drizzle } = require("drizzle-orm/better-sqlite3");
    drizzleInstance = drizzle(clientOrSqlite, { schema });
  }
  return drizzleInstance;
}

export { getDb, setDb, closeDb, resolveDbPath } from "./connection";
export * from "./schema";
export * from "./queries";

export type Profile = schema.ProfileRecord & {
  years_experience?: number | null;
  expected_salary?: number | null;
  title?: string | null;
};
export type JobPosting = schema.JobPostingRecord;
export type Application = schema.ApplicationRecord;
export type QABankEntry = schema.QABankRecord;
export type SearchQuery = schema.SearchQueryRecord;
export type Platform = schema.PlatformRecord;
export type Task = schema.TaskRecord;
export type Document = schema.DocumentRecord;
export type AutomationPlan = schema.AutomationPlanRecord;
export type Setting = schema.SettingRecord;
