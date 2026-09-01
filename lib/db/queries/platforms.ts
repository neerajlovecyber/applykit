import { eq } from "drizzle-orm";
import { getDrizzleDb } from "../index";
import { platforms, type PlatformRecord, type NewPlatformRecord } from "../schema";

export function getPlatforms(): PlatformRecord[] {
  return getDrizzleDb().select().from(platforms).orderBy(platforms.name).all();
}

export function getPlatformById(id: string): PlatformRecord | undefined {
  return getDrizzleDb().select().from(platforms).where(eq(platforms.id, id)).get();
}

export function upsertPlatform(data: NewPlatformRecord): PlatformRecord {
  const db = getDrizzleDb();
  const existing = getPlatformById(data.id);
  if (existing) {
    db.update(platforms).set(data).where(eq(platforms.id, data.id)).run();
  } else {
    db.insert(platforms).values(data).run();
  }
  return getPlatformById(data.id)!;
}

export function updatePlatformStatus(id: string, status: string, cookies?: string): void {
  const db = getDrizzleDb();
  const connectedAt = status === "connected" ? new Date().toISOString() : null;
  const updateData: Record<string, unknown> = {
    status,
    connected_at: connectedAt,
    last_checked_at: new Date().toISOString(),
  };
  if (cookies !== undefined) updateData.cookies = cookies;

  db.update(platforms).set(updateData).where(eq(platforms.id, id)).run();
}

export function updatePlatformAuthToken(id: string, authToken: string, status: string = "connected"): void {
  const db = getDrizzleDb();
  const connectedAt = status === "connected" ? new Date().toISOString() : null;
  db.update(platforms)
    .set({
      status,
      auth_token: authToken,
      connected_at: connectedAt,
      last_checked_at: new Date().toISOString(),
    })
    .where(eq(platforms.id, id))
    .run();
}

export function updatePlatformCredentials(
  id: string,
  data: { status: string; authToken?: string; cookies?: string }
): void {
  const db = getDrizzleDb();
  const connectedAt = data.status === "connected" ? new Date().toISOString() : null;
  const updateData: Record<string, unknown> = {
    status: data.status,
    connected_at: connectedAt,
    last_checked_at: new Date().toISOString(),
  };
  if (data.authToken !== undefined) updateData.auth_token = data.authToken;
  if (data.cookies !== undefined) updateData.cookies = data.cookies;

  db.update(platforms).set(updateData).where(eq(platforms.id, id)).run();
}

export function updatePlatformDailyCount(id: string, count: number): void {
  getDrizzleDb().update(platforms).set({ applied_today: count }).where(eq(platforms.id, id)).run();
}

export function resetPlatformDailyCounts(): void {
  getDrizzleDb().update(platforms).set({ applied_today: 0, limit_reset_at: new Date().toISOString() }).run();
}
