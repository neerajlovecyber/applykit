import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import {
  profiles,
  jobPostings,
  settings,
} from "./schema";
import { eq } from "drizzle-orm";

describe("Drizzle ORM Persistence Layer", () => {
  let sqlite: Database;
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        full_name TEXT,
        email TEXT,
        phone TEXT,
        location TEXT,
        linkedin_url TEXT,
        portfolio_url TEXT,
        summary TEXT,
        skills TEXT DEFAULT '[]',
        experience_years INTEGER,
        seniority TEXT DEFAULT 'mid',
        target_titles TEXT DEFAULT '[]',
        target_locations TEXT DEFAULT '[]',
        work_mode TEXT DEFAULT 'any',
        salary_min INTEGER,
        salary_max INTEGER,
        salary_currency TEXT DEFAULT 'INR',
        target_industries TEXT DEFAULT '[]',
        exclude_companies TEXT DEFAULT '[]',
        exclude_keywords TEXT DEFAULT '[]',
        min_company_size TEXT,
        visa_required INTEGER DEFAULT 0,
        resume_path TEXT,
        resume_data TEXT,
        resume_parsed TEXT,
        cover_letter_template TEXT,
        default_answers TEXT DEFAULT '{}',
        notice_period TEXT DEFAULT '30 days',
        is_active INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE job_postings (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        employment_type TEXT,
        seniority TEXT,
        description TEXT,
        requirements TEXT,
        salary_info TEXT,
        application_url TEXT,
        company_url TEXT,
        match_score REAL,
        match_breakdown TEXT,
        match_explanation TEXT,
        state TEXT DEFAULT 'new',
        discovered_at TEXT DEFAULT (datetime('now')),
        last_seen_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        raw_data TEXT,
        content_hash TEXT,
        UNIQUE(source, source_id)
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    db = drizzle({ client: sqlite });
  });

  describe("Profiles & Native JSON Columns", () => {
    it("inserts and automatically parses JSON columns without manual JSON.stringify", () => {
      db.insert(profiles)
        .values({
          id: "prof_1",
          name: "Senior Frontend Engineer",
          full_name: "Jane Doe",
          email: "jane@example.com",
          skills: ["TypeScript", "React", "Electron"],
          target_titles: ["Staff Engineer", "Frontend Lead"],
          default_answers: { notice_period: "15 days", preferred_work: "remote" },
        })
        .run();

      const result = db.select().from(profiles).where(eq(profiles.id, "prof_1")).get();
      expect(result).toBeDefined();
      expect(result?.full_name).toBe("Jane Doe");

      // Verify Drizzle automatically deserializes JSON fields into native JS arrays/objects
      expect(Array.isArray(result?.skills)).toBe(true);
      expect(result?.skills).toEqual(["TypeScript", "React", "Electron"]);
      expect(result?.target_titles).toEqual(["Staff Engineer", "Frontend Lead"]);
      expect(result?.default_answers).toEqual({ notice_period: "15 days", preferred_work: "remote" });
    });
  });

  describe("Job Postings & Filtering", () => {
    it("handles job insertions and ordered query filters", () => {
      db.insert(jobPostings)
        .values([
          {
            id: "job_1",
            source: "linkedin",
            source_id: "lk_101",
            title: "Senior Fullstack Engineer",
            company: "Acme Corp",
            match_score: 92.5,
            state: "new",
          },
          {
            id: "job_2",
            source: "linkedin",
            source_id: "lk_102",
            title: "Junior Developer",
            company: "Beta LLC",
            match_score: 65.0,
            state: "skipped",
          },
        ])
        .run();

      const newJobs = db
        .select()
        .from(jobPostings)
        .where(eq(jobPostings.state, "new"))
        .all();

      expect(newJobs.length).toBe(1);
      expect(newJobs[0].title).toBe("Senior Fullstack Engineer");
      expect(newJobs[0].match_score).toBe(92.5);
    });
  });

  describe("Settings Key-Value Handling", () => {
    it("supports setting insertion and updates", () => {
      db.insert(settings).values({ key: "theme", value: "dark" }).run();

      let setting = db.select().from(settings).where(eq(settings.key, "theme")).get();
      expect(setting?.value).toBe("dark");

      db.update(settings).set({ value: "light" }).where(eq(settings.key, "theme")).run();
      setting = db.select().from(settings).where(eq(settings.key, "theme")).get();
      expect(setting?.value).toBe("light");
    });
  });
});
