import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { profiles, type ProfileRecord, type NewProfileRecord } from "../schema";

function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p)) return p.map(String);
    } catch {}
  }
  return [];
}

function ensureObject(val: unknown): Record<string, string> {
  if (val && typeof val === "object" && !Array.isArray(val)) return val as Record<string, string>;
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val);
      if (p && typeof p === "object" && !Array.isArray(p)) return p;
    } catch {}
  }
  return {};
}

export type ProfileInput = Omit<
  Partial<NewProfileRecord>,
  "skills" | "target_titles" | "target_locations" | "target_industries" | "exclude_companies" | "exclude_keywords" | "default_answers"
> & {
  skills?: string | string[];
  target_titles?: string | string[];
  target_locations?: string | string[];
  target_industries?: string | string[];
  exclude_companies?: string | string[];
  exclude_keywords?: string | string[];
  default_answers?: string | Record<string, string>;
  [key: string]: any;
};

export function getProfiles(): ProfileRecord[] {
  return getDrizzleDb().select().from(profiles).orderBy(desc(profiles.created_at)).all();
}

export function getProfileById(id: string): ProfileRecord | undefined {
  return getDrizzleDb().select().from(profiles).where(eq(profiles.id, id)).get();
}

export function getActiveProfile(): ProfileRecord | undefined {
  return getDrizzleDb().select().from(profiles).where(eq(profiles.is_active, 1)).get();
}

export function createProfile(data: ProfileInput): ProfileRecord {
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
    skills: JSON.stringify(ensureArray(data.skills)),
    experience_years: data.experience_years ?? null,
    seniority: data.seniority ?? "mid",
    target_titles: JSON.stringify(ensureArray(data.target_titles)),
    target_locations: JSON.stringify(ensureArray(data.target_locations)),
    work_mode: data.work_mode ?? "any",
    salary_min: data.salary_min ?? null,
    salary_max: data.salary_max ?? null,
    salary_currency: data.salary_currency ?? "INR",
    target_industries: JSON.stringify(ensureArray(data.target_industries)),
    exclude_companies: JSON.stringify(ensureArray(data.exclude_companies)),
    exclude_keywords: JSON.stringify(ensureArray(data.exclude_keywords)),
    min_company_size: data.min_company_size ?? null,
    visa_required: data.visa_required ?? 0,
    resume_path: data.resume_path ?? null,
    resume_data: data.resume_data ?? null,
    resume_parsed: data.resume_parsed ?? null,
    cover_letter_template: data.cover_letter_template ?? null,
    default_answers: JSON.stringify(ensureObject(data.default_answers)),
    notice_period: data.notice_period ?? "30 days",
    is_active: data.is_active ?? 0,
  };

  db.insert(profiles).values(newRecord).run();
  return getProfileById(id)!;
}

export function updateProfile(id: string, data: ProfileInput): ProfileRecord | undefined {
  const db = getDrizzleDb();
  const updateData: Record<string, any> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  if (data.skills !== undefined) updateData.skills = JSON.stringify(ensureArray(data.skills));
  if (data.target_titles !== undefined) updateData.target_titles = JSON.stringify(ensureArray(data.target_titles));
  if (data.target_locations !== undefined) updateData.target_locations = JSON.stringify(ensureArray(data.target_locations));
  if (data.target_industries !== undefined) updateData.target_industries = JSON.stringify(ensureArray(data.target_industries));
  if (data.exclude_companies !== undefined) updateData.exclude_companies = JSON.stringify(ensureArray(data.exclude_companies));
  if (data.exclude_keywords !== undefined) updateData.exclude_keywords = JSON.stringify(ensureArray(data.exclude_keywords));
  if (data.default_answers !== undefined) updateData.default_answers = JSON.stringify(ensureObject(data.default_answers));

  db.update(profiles).set(updateData).where(eq(profiles.id, id)).run();
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
