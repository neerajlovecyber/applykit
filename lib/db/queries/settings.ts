import { eq } from "drizzle-orm";
import { getDrizzleDb } from "../index";
import { settings } from "../schema";

export function getSetting(key: string): string | undefined {
  const row = getDrizzleDb().select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? undefined;
}

export function getAllSettings(): Record<string, string> {
  const rows = getDrizzleDb().select().from(settings).all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.value !== null) {
      result[row.key] = row.value;
    }
  }
  return result;
}

export function setSetting(key: string, value: string): void {
  getDrizzleDb()
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value },
    })
    .run();
}
