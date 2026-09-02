/**
 * Job Discovery Service.
 *
 * Deep domain service coordinating multi-platform job discovery,
 * browser pool lifecycle, deduplication, normalization, and persistence.
 */

import type { JobDiscoveryAdapter, RawJobPosting, SearchOptions, SearchRunResult } from "./types";
import { normalizeRawJob } from "./normalizer";
import { checkDuplicateJob } from "./dedup";
import {
  upsertJobPosting,
  updateJobPostingScore,
  getActiveProfile,
  updateSearchQueryLastRun,
} from "@/lib/db";
import { scoreJobFit } from "@/lib/providers/provider-registry";
import { acquirePage, releasePage } from "@/lib/execution/browser-pool";
import {
  LinkedInDiscoveryAdapter,
  NaukriDiscoveryAdapter,
  IndeedDiscoveryAdapter,
} from "./adapters";

export class JobDiscoveryService {
  private adapters = new Map<string, JobDiscoveryAdapter>();
  private pageAcquirer: (headless?: boolean) => Promise<any>;
  private pageReleaser: (page: any) => Promise<void>;

  constructor(options?: {
    pageAcquirer?: (headless?: boolean) => Promise<any>;
    pageReleaser?: (page: any) => Promise<void>;
    skipDefaultAdapters?: boolean;
  }) {
    this.pageAcquirer = options?.pageAcquirer ?? acquirePage;
    this.pageReleaser = options?.pageReleaser ?? releasePage;
    if (!options?.skipDefaultAdapters) {
      this.registerAdapter(new LinkedInDiscoveryAdapter());
      this.registerAdapter(new NaukriDiscoveryAdapter());
      this.registerAdapter(new IndeedDiscoveryAdapter());
    }
  }

  /**
   * Register a discovery adapter for a specific platform.
   */
  registerAdapter(adapter: JobDiscoveryAdapter): void {
    this.adapters.set(adapter.platform.toLowerCase(), adapter);
  }

  /**
   * Retrieve the adapter for a given platform.
   */
  getAdapter(platform: string): JobDiscoveryAdapter | undefined {
    return this.adapters.get(platform.toLowerCase());
  }

  /**
   * Execute job discovery across one or all platforms.
   */
  async executeSearch(options: SearchOptions, queryId?: string): Promise<SearchRunResult> {
    console.log(`[JobDiscoveryService] Starting search: source=${options.source}, keywords="${options.keywords}"`);

    const source = options.source.toLowerCase();

    if (source === "all") {
      return this.executeAllPlatforms(options, queryId);
    }

    const adapter = this.getAdapter(source);
    if (!adapter) {
      throw new Error(`[JobDiscoveryService] No discovery adapter registered for platform: "${options.source}"`);
    }

    let rawJobs: RawJobPosting[] = [];
    let errorMsg: string | undefined;

    let page: any = null;
    try {
      page = await this.pageAcquirer(true);
      rawJobs = await adapter.scrape(page, options);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[JobDiscoveryService] Scrape failed for ${source}:`, errorMsg);
    } finally {
      if (page) {
        await this.pageReleaser(page).catch(() => {});
      }
    }

    if (errorMsg) {
      if (queryId) {
        updateSearchQueryLastRun(queryId, 0, false);
      }
      return {
        source,
        totalScraped: 0,
        newJobsAdded: 0,
        duplicatesSkipped: 0,
        error: errorMsg,
      };
    }

    return this.processDiscoveredJobs(source, rawJobs, queryId);
  }

  /**
   * Run discovery across all registered adapters concurrently.
   */
  private async executeAllPlatforms(options: SearchOptions, queryId?: string): Promise<SearchRunResult> {
    const activeAdapters = Array.from(this.adapters.values());
    const results = await Promise.allSettled(
      activeAdapters.map((adapter) => this.executeSearch({ ...options, source: adapter.platform }))
    );

    let totalScraped = 0;
    let newJobsAdded = 0;
    let duplicatesSkipped = 0;
    const errors: string[] = [];

    for (const res of results) {
      if (res.status === "fulfilled") {
        totalScraped += res.value.totalScraped;
        newJobsAdded += res.value.newJobsAdded;
        duplicatesSkipped += res.value.duplicatesSkipped;
        if (res.value.error) errors.push(`${res.value.source}: ${res.value.error}`);
      } else {
        errors.push(res.reason instanceof Error ? res.reason.message : String(res.reason));
      }
    }

    if (queryId) {
      updateSearchQueryLastRun(queryId, newJobsAdded, errors.length === 0);
    }

    return {
      source: "all",
      totalScraped,
      newJobsAdded,
      duplicatesSkipped,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  }

  /**
   * Deduplicates, normalizes, persists, and scores fit for raw discovered jobs.
   */
  async processDiscoveredJobs(
    source: string,
    rawJobs: RawJobPosting[],
    queryId?: string
  ): Promise<SearchRunResult> {
    let newJobsAdded = 0;
    let duplicatesSkipped = 0;

    const activeProfile = getActiveProfile();
    const profileSummary = activeProfile
      ? `Candidate: ${activeProfile.name}. Skills: ${activeProfile.skills}. Experience: ${activeProfile.experience_years} years.`
      : undefined;

    for (const raw of rawJobs) {
      const dedup = checkDuplicateJob(raw);
      if (dedup.isDuplicate) {
        duplicatesSkipped++;
        continue;
      }

      // Normalize & persist to database
      const norm = normalizeRawJob(raw);
      const saved = upsertJobPosting(norm);
      newJobsAdded++;

      // AI Fit Scoring if active profile exists
      if (profileSummary && saved.description) {
        try {
          const fit = await scoreJobFit(profileSummary, `${saved.title} at ${saved.company}. ${saved.description}`);
          updateJobPostingScore(saved.id, fit.score, JSON.stringify(fit.breakdown), fit.explanation);
        } catch (err) {
          console.error(`[JobDiscoveryService] AI scoring failed for job ${saved.id}:`, err);
        }
      }
    }

    if (queryId) {
      updateSearchQueryLastRun(queryId, newJobsAdded, true);
    }

    console.log(
      `[JobDiscoveryService] Finished discovery for ${source}: total=${rawJobs.length}, added=${newJobsAdded}, skipped=${duplicatesSkipped}`
    );

    return {
      source,
      totalScraped: rawJobs.length,
      newJobsAdded,
      duplicatesSkipped,
    };
  }
}

// Global singleton instance
export const discoveryService = new JobDiscoveryService();
