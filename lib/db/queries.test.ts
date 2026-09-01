import { describe, expect, it, beforeEach } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { initDrizzleDb, setDb, getDb } from "./index";
import {
  createProfile,
  getProfileById,
  getActiveProfile,
  updateProfile,
  upsertJobPosting,
  getJobPostingById,
  updateJobPostingState,
  createApplication,
  getApplicationById,
  updateApplicationStatus,
  createTask,
  getNextPendingTask,
  updateTaskStatus,
  upsertQABankEntry,
  findQAAnswer,
  setSetting,
  getSetting,
  createSearchQuery,
  getSearchQueryById,
  updateSearchQueryLastRun,
  addJob,
  getJobById,
  addHistoryEntry,
  getHistory,
} from "./queries";

describe("Deepened Database Persistence Module", () => {
  let sqlite: any;

  beforeEach(() => {
    // Spin up an in-memory SQLite instance using getDb(':memory:') which initializes all tables
    sqlite = getDb(":memory:");
    const drizzleClient = drizzle({ client: sqlite, schema });
    setDb(sqlite);
    initDrizzleDb(drizzleClient);
  });

  describe("Profiles & Preferences", () => {
    it("creates, retrieves, and updates profiles with array/string JSON normalization", () => {
      const p = createProfile({
        name: "Test Engineer",
        full_name: "Alex Doe",
        email: "alex@example.com",
        skills: ["TypeScript", "Docker", "AWS"],
        is_active: 1,
      });

      expect(p.id).toBeDefined();
      expect(p.name).toBe("Test Engineer");
      expect(JSON.parse(p.skills || "[]")).toEqual(["TypeScript", "Docker", "AWS"]);

      const active = getActiveProfile();
      expect(active?.id).toBe(p.id);

      const updated = updateProfile(p.id, {
        summary: "Updated professional summary",
        // Test passing stringified array to verify automatic normalization
        skills: JSON.stringify(["Kubernetes", "Linux", "Terraform"]),
      });

      expect(updated?.summary).toBe("Updated professional summary");
      expect(JSON.parse(updated?.skills || "[]")).toEqual(["Kubernetes", "Linux", "Terraform"]);
    });
  });

  describe("Job Postings & Upserting", () => {
    it("upserts job postings cleanly by source and source_id", () => {
      const job1 = upsertJobPosting({
        source: "linkedin",
        source_id: "li-12345",
        title: "Platform Engineer",
        company: "Acme Corp",
      });

      expect(job1.id).toBeDefined();
      expect(job1.state).toBe("new");

      updateJobPostingState(job1.id, "applied");
      const fetched = getJobPostingById(job1.id);
      expect(fetched?.state).toBe("applied");

      // Upsert same source + source_id with updated title
      const job2 = upsertJobPosting({
        source: "linkedin",
        source_id: "li-12345",
        title: "Senior Platform Engineer",
        company: "Acme Corp",
      });

      expect(job2.id).toBe(job1.id);
      expect(job2.title).toBe("Senior Platform Engineer");
    });
  });

  describe("Applications & State History", () => {
    it("creates applications and tracks state progression history", () => {
      const p = createProfile({ name: "DevOps Lead", is_active: 1 });
      const job = upsertJobPosting({
        source: "indeed",
        source_id: "ind-999",
        title: "Cloud Architect",
        company: "CloudLab",
      });

      const app = createApplication({
        job_id: job.id,
        profile_id: p.id,
        status: "pending_review",
      });

      expect(app.id).toBeDefined();
      expect(app.status).toBe("pending_review");

      updateApplicationStatus(app.id, "submitted", "Automatic submission via Playwright");
      const updated = getApplicationById(app.id);

      expect(updated?.status).toBe("submitted");
      expect(updated?.submitted_at).toBeDefined();

      const history = JSON.parse(updated?.state_history || "[]");
      expect(history.length).toBe(2);
      expect(history[1].to).toBe("submitted");
      expect(history[1].reason).toBe("Automatic submission via Playwright");
    });
  });

  describe("Tasks Queue & Priority Ordering", () => {
    it("orders next pending tasks by priority DESC and scheduled_for ASC", () => {
      createTask({
        kind: "apply",
        priority: 0,
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
      });

      const highPriority = createTask({
        kind: "apply",
        priority: 10,
        scheduled_for: new Date(Date.now() - 5000).toISOString(),
      });

      const next = getNextPendingTask();
      expect(next).toBeDefined();
      expect(next?.id).toBe(highPriority.id);
      expect(next?.priority).toBe(10);

      updateTaskStatus(next!.id, "running");
      const runningTask = getNextPendingTask();
      // Since highPriority is now running, the priority 0 task is next
      expect(runningTask?.priority).toBe(0);
    });
  });

  describe("QA Bank & Learned Answers", () => {
    it("matches exact patterns, partial patterns, and similarity fallback", () => {
      const p = createProfile({ name: "QA Candidate" });

      upsertQABankEntry({
        profile_id: p.id,
        question_pattern: "Are you authorized to work in India?",
        answer: "Yes, I am a citizen.",
      });

      // 1. Exact match
      const exact = findQAAnswer(p.id, "Are you authorized to work in India?");
      expect(exact?.answer).toBe("Yes, I am a citizen.");

      // 2. Partial match
      const partial = findQAAnswer(p.id, "Please confirm: Are you authorized to work in India? (Required)");
      expect(partial?.answer).toBe("Yes, I am a citizen.");

      // 3. Similarity match (similar phrasing)
      const sim = findQAAnswer(p.id, "Are you legally authorized to work in India");
      expect(sim?.answer).toBe("Yes, I am a citizen.");
    });
  });

  describe("Settings Key-Value Store", () => {
    it("sets and retrieves configuration keys", () => {
      setSetting("theme", "dark");
      expect(getSetting("theme")).toBe("dark");

      setSetting("theme", "system");
      expect(getSetting("theme")).toBe("system");
    });
  });

  describe("Search Queries & Tracking", () => {
    it("records query last run timestamps and intervals", () => {
      const p = createProfile({ name: "Job Hunter" });
      const sq = createSearchQuery({
        profile_id: p.id,
        source: "linkedin",
        keywords: "DevOps Engineer",
        run_interval_hours: 12,
      });

      expect(sq.id).toBeDefined();
      expect(sq.result_count).toBe(0);

      updateSearchQueryLastRun(sq.id, 25, true);
      const updated = getSearchQueryById(sq.id);

      expect(updated?.result_count).toBe(25);
      expect(updated?.last_run_at).toBeDefined();
      expect(updated?.last_success_at).toBeDefined();
      expect(updated?.next_run_at).toBeDefined();
    });
  });

  describe("Legacy Compatibility (Jobs & History)", () => {
    it("inserts and tracks legacy jobs and history rows", () => {
      const job = addJob({
        title: "Legacy Role",
        url: "https://example.com/job/1",
        platform: "indeed",
      });

      expect(job.id).toBeDefined();
      expect(getJobById(job.id)?.title).toBe("Legacy Role");

      const hist = addHistoryEntry({
        job_id: job.id,
        title: "Legacy Role",
        company: "Old Company",
        platform: "indeed",
        status: "applied",
      });

      expect(hist.id).toBeDefined();
      const allHist = getHistory();
      expect(allHist.length).toBe(1);
      expect(allHist[0].company).toBe("Old Company");
    });
  });
});
