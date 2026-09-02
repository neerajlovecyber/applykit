/**
 * SQLite Connection & Database Initialization.
 *
 * Provides resilient SQLite instance lifecycle and WAL mode configuration for ApplyKit.
 * Schema and tables are managed directly by Drizzle ORM migrations.
 */

import { join } from "path";
import os from "os";
import fs from "fs";

let dbInstance: any = null;

function createSqliteConnection(dbPath: string): any {
  if (typeof (process.versions as any).bun !== "undefined") {
    const { Database } = require("bun:sqlite");
    return new Database(dbPath);
  }
  const Database = require("better-sqlite3");
  return new Database(dbPath);
}

export function resolveDbPath(): string {
  if (process.env.APPLYKIT_DB_PATH) {
    return process.env.APPLYKIT_DB_PATH;
  }
  try {
    const electron = require("electron");
    if (electron?.app && typeof electron.app.getPath === "function") {
      return join(electron.app.getPath("userData"), "applykit.db");
    }
  } catch {}
  return join(os.homedir(), ".applykit", "applykit.db");
}

export function getDb(customPath?: string): any {
  if (dbInstance && !customPath) return dbInstance;

  const dbPath = customPath || resolveDbPath();
  if (dbPath !== ":memory:") {
    const dir = join(dbPath, "..");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const instance = createSqliteConnection(dbPath);

  // Enable WAL mode for high-performance concurrent reads
  if (dbPath !== ":memory:") {
    try {
      if (instance.pragma) instance.pragma("journal_mode = WAL");
      else instance.exec("PRAGMA journal_mode = WAL;");
    } catch {}
  }
  try {
    if (instance.pragma) instance.pragma("foreign_keys = ON");
    else instance.exec("PRAGMA foreign_keys = ON;");
  } catch {}

  if (!customPath) {
    dbInstance = instance;
  }

  // Ensure Drizzle ORM migrations run directly from schema
  const { runMigrations, createDrizzleClient } = require("./index");
  const client = createDrizzleClient(instance);
  runMigrations(client);

  return instance;
}

export function setDb(customDb: any): void {
  dbInstance = customDb;
}

export function closeDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}
