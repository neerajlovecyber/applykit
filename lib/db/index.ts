import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type Database from "better-sqlite3";
import * as schema from "./schema";

let drizzleInstance: BetterSQLite3Database<typeof schema> | null = null;

/**
 * Get the typed Drizzle ORM database instance wrapping better-sqlite3.
 */
export function getDrizzleDb(): BetterSQLite3Database<typeof schema> {
  if (drizzleInstance) return drizzleInstance;
  // Lazy-load getDb so module imports do not trigger Electron 'app' at load time during testing
  const { getDb } = require("../main/db");
  const sqlite = getDb();
  drizzleInstance = drizzle(sqlite, { schema });
  return drizzleInstance;
}

/**
 * Helper to initialize or re-bind Drizzle to an explicit better-sqlite3 instance (useful for testing).
 */
export function createDrizzleClient(sqlite: Database.Database): BetterSQLite3Database<typeof schema> {
  return drizzle(sqlite, { schema });
}

export * from "./schema";
