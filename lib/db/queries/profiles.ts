import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { profiles, type ProfileRecord, type NewProfileRecord } from "../schema";

export function getProfiles(): ProfileRecord[] {
  return getDrizzleDb().select().from(profiles).orderBy(desc(profiles.created_at)).all();
}

export function getProfileById(id: string): ProfileRecord | undefined {
  return getDrizzleDb().select().from(profiles).where(eq(profiles.id, id)).get();
}

export function getActiveProfile(): ProfileRecord | undefined {
  return getDrizzleDb().select().from(profiles).where(eq(profiles.is_active, 1)).get();
}

export function createProfile(data: Partial<NewProfileRecord>): ProfileRecord {
  const id = data.id || randomUUID();
  const db = getDrizzleDb();

  const newRecord: NewProfileRecord = {
    id,
    name: data.name ?? "New Profile",
    full_name: data.full_name ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    location: data.location ?? null,
    linkedin_url: data.linkedin_url ?? null,
    portfolio_url: data.portfolio_url ?? null,
    summary: data.summary ?? null,
    skills: data.skills ?? [],
    experience_years: data.experience_years ?? null,
    seniority: data.seniority ?? "mid",
    target_titles: data.target_titles ?? [],
    target_locations: data.target_locations ?? [],
    work_mode: data.work_mode ?? "any",
    salary_min: data.salary_min ?? null,
    salary_max: data.salary_max ?? null,
    salary_currency: data.salary_currency ?? "INR",
    target_industries: data.target_industries ?? [],
    exclude_companies: data.exclude_companies ?? [],
    exclude_keywords: data.exclude_keywords ?? [],
    min_company_size: data.min_company_size ?? null,
    visa_required: data.visa_required ?? 0,
    resume_path: data.resume_path ?? null,
    resume_data: data.resume_data ?? null,
    resume_parsed: data.resume_parsed ?? null,
    cover_letter_template: data.cover_letter_template ?? null,
    default_answers: data.default_answers ?? {},
    notice_period: data.notice_period ?? "30 days",
    is_active: data.is_active ?? 0,
  };

  db.insert(profiles).values(newRecord).run();
  return getProfileById(id)!;
}

export function updateProfile(id: string, data: Partial<NewProfileRecord>): ProfileRecord | undefined {
  const db = getDrizzleDb();
  db.update(profiles)
    .set({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .where(eq(profiles.id, id))
    .run();

  return getProfileById(id);
}

export function deleteProfile(id: string): boolean {
  const db = getDrizzleDb();
  const result = db.delete(profiles).where(eq(profiles.id, id)).run();
  return result.changes > 0;
}

export function setActiveProfile(id: string): void {
  const db = getDrizzleDb();
  db.update(profiles).set({ is_active: 0 }).run();
  db.update(profiles).set({ is_active: 1 }).where(eq(profiles.id, id)).run();
}
