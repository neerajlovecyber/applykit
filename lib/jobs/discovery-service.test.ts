import { describe, expect, it, beforeEach } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "@/lib/db/schema";
import { initDrizzleDb, setDb, getDb } from "@/lib/db";
import { JobDiscoveryService } from "./discovery-service";
import type { JobDiscoveryAdapter, RawJobPosting, SearchOptions } from "./types";
import { getJobPostings, createSearchQuery, getSearchQueryById, createProfile } from "@/lib/db/queries";

describe("Job Discovery Service (Candidate 2)", () => {
  let sqlite: any;
  let service: JobDiscoveryService;

  beforeEach(() => {
    sqlite = getDb(":memory:");
    const drizzleClient = drizzle({ client: sqlite, schema });
    setDb(sqlite);
    initDrizzleDb(drizzleClient);

    service = new JobDiscoveryService({
      pageAcquirer: async () => ({ isMockPage: true }),
      pageReleaser: async () => {},
    });
  });

  describe("Adapter Registry", () => {
    it("registers default adapters and looks up platforms case-insensitively", () => {
      expect(service.getAdapter("linkedin")).toBeDefined();
      expect(service.getAdapter("LINKEDIN")).toBeDefined();
      expect(service.getAdapter("naukri")).toBeDefined();
      expect(service.getAdapter("indeed")).toBeDefined();
      expect(service.getAdapter("nonexistent")).toBeUndefined();
    });

    it("allows registering custom discovery adapters", () => {
      const mockAdapter: JobDiscoveryAdapter = {
        platform: "greenhouse",
        scrape: async () => [],
      };

      service.registerAdapter(mockAdapter);
      expect(service.getAdapter("greenhouse")).toBe(mockAdapter);
    });
  });

  describe("Discovered Job Processing & Deduplication", () => {
    it("processes, normalizes, and persists discovered jobs", async () => {
      const mockJobs: RawJobPosting[] = [
        {
          source: "linkedin",
          sourceId: "mock-101",
          title: "Senior SRE",
          company: "Acme Cloud",
          location: "Remote",
          description: "Kubernetes and Terraform operations.",
        },
        {
          source: "linkedin",
          sourceId: "mock-102",
          title: "Platform Architect",
          company: "CloudLab",
          location: "Bengaluru",
          description: "AWS and multi-region infra.",
        },
      ];

      const result = await service.processDiscoveredJobs("linkedin", mockJobs);

      expect(result.totalScraped).toBe(2);
      expect(result.newJobsAdded).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);

      const saved = getJobPostings();
      expect(saved.length).toBe(2);
      expect(saved.find((j) => j.source_id === "mock-101")?.title).toBe("Senior SRE");
    });

    it("skips duplicates on subsequent runs", async () => {
      const mockJobs: RawJobPosting[] = [
        {
          source: "indeed",
          sourceId: "ind-201",
          title: "DevOps Engineer",
          company: "TechNova",
          location: "Delhi",
        },
      ];

      const firstRun = await service.processDiscoveredJobs("indeed", mockJobs);
      expect(firstRun.newJobsAdded).toBe(1);
      expect(firstRun.duplicatesSkipped).toBe(0);

      // Re-run with the exact same job
      const secondRun = await service.processDiscoveredJobs("indeed", mockJobs);
      expect(secondRun.newJobsAdded).toBe(0);
      expect(secondRun.duplicatesSkipped).toBe(1);

      // Database should still only contain 1 row
      const saved = getJobPostings();
      expect(saved.filter((j) => j.source_id === "ind-201").length).toBe(1);
    });
  });

  describe("executeSearch with Mock Adapters", () => {
    it("executes single-source search and updates searchQuery stats", async () => {
      const profile = createProfile({
        name: "Jane Dev",
        email: "jane@example.com",
      });

      const query = createSearchQuery({
        profile_id: profile.id,
        source: "lever",
        keywords: "Frontend Engineer",
        location: "Berlin",
      });

      const mockLeverAdapter: JobDiscoveryAdapter = {
        platform: "lever",
        scrape: async () => [
          {
            source: "lever",
            sourceId: "lev-1",
            title: "Frontend Engineer",
            company: "SoundWave",
          },
        ],
      };

      service.registerAdapter(mockLeverAdapter);

      const result = await service.executeSearch(
        { source: "lever", keywords: "Frontend Engineer" },
        query.id
      );

      expect(result.totalScraped).toBe(1);
      expect(result.newJobsAdded).toBe(1);

      const updatedQuery = getSearchQueryById(query.id);
      expect(updatedQuery?.last_run_at).toBeDefined();
      expect(updatedQuery?.result_count).toBe(1);
    });

    it("executes multi-source search across all registered adapters", async () => {
      const customService = new JobDiscoveryService({
        pageAcquirer: async () => ({}),
        pageReleaser: async () => {},
        skipDefaultAdapters: true,
      });

      customService.registerAdapter({
        platform: "plat1",
        scrape: async () => [
          { source: "plat1", sourceId: "p1-1", title: "Dev 1", company: "C1" },
        ],
      });
      customService.registerAdapter({
        platform: "plat2",
        scrape: async () => [
          { source: "plat2", sourceId: "p2-1", title: "Dev 2", company: "C2" },
        ],
      });

      const result = await customService.executeSearch({
        source: "all",
        keywords: "Engineer",
      });

      expect(result.source).toBe("all");
      expect(result.totalScraped).toBe(2);
      expect(result.newJobsAdded).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);
    });

    it("isolates adapter errors during search and returns error payload", async () => {
      const failingAdapter: JobDiscoveryAdapter = {
        platform: "flaky",
        scrape: async () => {
          throw new Error("Network timeout while navigating");
        },
      };

      service.registerAdapter(failingAdapter);

      const result = await service.executeSearch({
        source: "flaky",
        keywords: "Manager",
      });

      expect(result.totalScraped).toBe(0);
      expect(result.newJobsAdded).toBe(0);
      expect(result.error).toContain("Network timeout");
    });
  });

  describe("Error Handling", () => {
    it("throws clear error when executing search for unsupported source", async () => {
      expect(
        service.executeSearch({
          source: "unsupported_platform",
          keywords: "DevOps",
        })
      ).rejects.toThrow('No discovery adapter registered for platform: "unsupported_platform"');
    });
  });
});
