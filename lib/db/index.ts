/**
 * Database Persistence Module (Unified Drizzle ORM + SQLite).
 *
 * Consolidates connection management, Drizzle client lifecycle,
 * table schemas, migrations, and typed query operations behind the @/lib/db seam.
 */

import * as schema from "./schema";
import { getDb } from "./connection";
import { join } from "path";
import fs from "fs";

let drizzleInstance: any = null;

function resolveMigrationsFolder(): string {
  const localPath = join(__dirname, "migrations");
  if (fs.existsSync(localPath)) return localPath;
  const projectPath = join(process.cwd(), "lib", "db", "migrations");
  if (fs.existsSync(projectPath)) return projectPath;
  try {
    const electron = require("electron");
    if (electron?.app?.isPackaged) {
      return join(process.resourcesPath, "migrations");
    }
  } catch {}
  return localPath;
}

/**
 * Executes Drizzle ORM schema migrations on the given Drizzle instance.
 */
const _migratedClients = new WeakSet<any>();

export function runMigrations(drizzleClient: any): void {
  if (!drizzleClient || _migratedClients.has(drizzleClient)) return;

  const migrationsFolder = resolveMigrationsFolder();
  if (!fs.existsSync(migrationsFolder)) return;

  try {
    if (typeof (process.versions as any).bun !== "undefined") {
      const { migrate } = require("drizzle-orm/bun-sqlite/migrator");
      migrate(drizzleClient, { migrationsFolder });
    } else {
      const { migrate } = require("drizzle-orm/better-sqlite3/migrator");
      migrate(drizzleClient, { migrationsFolder });
    }
    _migratedClients.add(drizzleClient);
  } catch (err: any) {
    const msg: string = err?.message || String(err);
    // Suppress benign "table/index already exists" re-run notices from Drizzle
    const isBenign =
      msg.includes("already exists") ||
      msg.includes("Failed to run the query") && (msg.includes("CREATE TABLE") || msg.includes("CREATE INDEX"));
    if (!isBenign) {
      console.warn("[Drizzle Migrator] Notice:", msg);
    }
    _migratedClients.add(drizzleClient);
  }
}

let _repairDone = false;

export function repairMissingJobUrls(sqlite: any): void {
  if (_repairDone || !sqlite) return;
  try {
    const isBun = typeof (process.versions as any).bun !== "undefined";
    const updateLinkedin = `
      UPDATE job_postings
      SET application_url = 'https://www.linkedin.com/jobs/view/' || source_id || '/'
      WHERE source = 'linkedin' AND (application_url IS NULL OR application_url = '') AND source_id GLOB '[0-9]*';
    `;
    const updateNaukri = `
      UPDATE job_postings
      SET application_url = 'https://www.naukri.com/job-listings-' || source_id
      WHERE source = 'naukri' AND (application_url IS NULL OR application_url = '') AND source_id GLOB '[0-9]*';
    `;
    if (isBun && typeof sqlite.run === "function") {
      sqlite.run(updateLinkedin);
      sqlite.run(updateNaukri);
    } else if (typeof sqlite.exec === "function") {
      sqlite.exec(updateLinkedin);
      sqlite.exec(updateNaukri);
    }
    _repairDone = true;
  } catch {
    // Suppress benign notices if table does not exist yet
  }
}

/**
 * Get the typed Drizzle ORM database instance wrapping SQLite.
 */
export function getDrizzleDb(): any {
  if (drizzleInstance) return drizzleInstance;

  const sqlite = getDb();

  if (typeof (process.versions as any).bun !== "undefined") {
    const { drizzle } = require("drizzle-orm/bun-sqlite");
    drizzleInstance = drizzle({ client: sqlite, schema });
  } else {
    const { drizzle } = require("drizzle-orm/better-sqlite3");
    drizzleInstance = drizzle(sqlite, { schema });
  }

  runMigrations(drizzleInstance);
  repairMissingJobUrls(sqlite);
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
  runMigrations(drizzleInstance);
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
