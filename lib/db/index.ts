import * as schema from "./schema";

let drizzleInstance: any = null;

/**
 * Get the typed Drizzle ORM database instance wrapping SQLite.
 */
export function getDrizzleDb(): any {
  if (drizzleInstance) return drizzleInstance;

  if (typeof (process.versions as any).bun !== "undefined") {
    const { drizzle } = require("drizzle-orm/bun-sqlite");
    const { getDb } = require("../main/db");
    const sqlite = getDb();
    drizzleInstance = drizzle({ client: sqlite, schema });
    return drizzleInstance;
  }

  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const { getDb } = require("../main/db");
  const sqlite = getDb();
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

export { getDb, setDb } from "../main/db";
export * from "./schema";

