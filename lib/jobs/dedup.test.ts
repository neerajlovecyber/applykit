import { describe, expect, it, beforeEach } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "@/lib/db/schema";
import { initDrizzleDb, setDb, getDb } from "@/lib/db";
import { checkDuplicateJob } from "./dedup";
import { upsertJobPosting } from "@/lib/db/queries";
import { normalizeRawJob } from "./normalizer";
import type { RawJobPosting } from "./types";

describe("Job Deduplication Engine", () => {
  let sqlite: any;

  beforeEach(() => {
    sqlite = getDb(":memory:");
    const drizzleClient = drizzle({ client: sqlite, schema });
    setDb(sqlite);
    initDrizzleDb(drizzleClient);
  });

  it("returns isDuplicate = false for new job postings", () => {
    const raw: RawJobPosting = {
      source: "linkedin",
      sourceId: "job-101",
      title: "Staff Engineer",
      company: "Acme Corp",
      location: "San Francisco, CA",
    };

    const res = checkDuplicateJob(raw);
    expect(res.isDuplicate).toBe(false);
  });

  it("identifies duplicates by exact (source, sourceId)", () => {
    const raw: RawJobPosting = {
      source: "linkedin",
      sourceId: "job-101",
      title: "Staff Engineer",
      company: "Acme Corp",
    };

    const norm = normalizeRawJob(raw);
    const saved = upsertJobPosting(norm);

    const check = checkDuplicateJob(raw);
    expect(check.isDuplicate).toBe(true);
    expect(check.reason).toBe("source_id");
    expect(check.existingId).toBe(saved.id);
  });

  it("identifies duplicates across different sourceIds by content_hash", () => {
    const original: RawJobPosting = {
      source: "indeed",
      sourceId: "ind-101",
      title: "Principal Engineer",
      company: "TechNova",
      location: "Bengaluru",
      description: "Leading distributed systems infrastructure.",
    };

    const norm = normalizeRawJob(original);
    const saved = upsertJobPosting(norm);

    // Same title, company, location, and description, but discovered under a different sourceId
    const duplicateDiscovery: RawJobPosting = {
      source: "indeed",
      sourceId: "ind-reposted-999",
      title: "Principal Engineer",
      company: "TechNova",
      location: "Bengaluru",
      description: "Leading distributed systems infrastructure.",
    };

    const check = checkDuplicateJob(duplicateDiscovery);
    expect(check.isDuplicate).toBe(true);
    expect(check.reason).toBe("content_hash");
    expect(check.existingId).toBe(saved.id);
  });
});
