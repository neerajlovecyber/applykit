/**
 * Unified Search Manager.
 *
 * Orchestrates job discovery across LinkedIn, Naukri, and Indeed scrapers,
 * normalizes raw listings, deduplicates against SQLite, scores fit using
 * Vercel AI SDK, and persists new job postings.
 */

import type { SearchOptions, SearchResultPayload } from "../types";
import { searchLinkedInJobs } from "./linkedin-search";
import { searchNaukriJobs } from "./naukri-search";
import { searchIndeedJobs } from "./indeed-search";
import { normalizeRawJob } from "../normalizer";
import { checkDuplicateJob } from "../dedup";
import { upsertJobPosting, updateJobPostingScore, getActiveProfile, updateSearchQueryLastRun } from "@/lib/main/db-queries";
import { scoreJobFit } from "@/lib/providers/provider-registry";

export interface SearchRunResult {
  source: string;
  totalScraped: number;
  newJobsAdded: number;
  duplicatesSkipped: number;
  error?: string;
}

/**
 * Execute a single search options payload across target source.
 */
export async function executeSearch(options: SearchOptions, queryId?: string): Promise<SearchRunResult> {
  console.log(`[SearchManager] Starting search for source: ${options.source}, keywords: "${options.keywords}"`);

  let payload: SearchResultPayload;

  switch (options.source) {
    case "linkedin":
      payload = await searchLinkedInJobs(options);
      break;
    case "naukri":
      payload = await searchNaukriJobs(options);
      break;
    case "indeed":
      payload = await searchIndeedJobs(options);
      break;
    case "all": {
      const [li, nk, ind] = await Promise.all([
        searchLinkedInJobs({ ...options, source: "linkedin" }),
        searchNaukriJobs({ ...options, source: "naukri" }),
        searchIndeedJobs({ ...options, source: "indeed" }),
      ]);
      payload = {
        source: "all",
        query: options,
        jobs: [...li.jobs, ...nk.jobs, ...ind.jobs],
        totalFound: li.jobs.length + nk.jobs.length + ind.jobs.length,
        scrapedAt: new Date().toISOString(),
      };
      break;
    }
    default:
      throw new Error(`Unsupported search source: ${options.source}`);
  }

  if (payload.error) {
    if (queryId) {
      updateSearchQueryLastRun(queryId, 0, false);
    }
    return {
      source: options.source,
      totalScraped: 0,
      newJobsAdded: 0,
      duplicatesSkipped: 0,
      error: payload.error,
    };
  }

  let newJobsAdded = 0;
  let duplicatesSkipped = 0;

  const activeProfile = getActiveProfile();
  const profileSummary = activeProfile
    ? `Candidate: ${activeProfile.name}. Skills: ${activeProfile.skills}. Experience: ${activeProfile.experience_years} years.`
    : undefined;

  for (const raw of payload.jobs) {
    const dedup = checkDuplicateJob(raw);
    if (dedup.isDuplicate) {
      duplicatesSkipped++;
      continue;
    }

    // Normalize & save to SQLite
    const norm = normalizeRawJob(raw);
    const saved = upsertJobPosting(norm);
    newJobsAdded++;

    // Perform Vercel AI SDK fit scoring if active profile exists
    if (profileSummary && saved.description) {
      try {
        const fit = await scoreJobFit(profileSummary, `${saved.title} at ${saved.company}. ${saved.description}`);
        updateJobPostingScore(saved.id, fit.score, JSON.stringify(fit.breakdown), fit.explanation);
      } catch (err) {
        console.error(`[SearchManager] AI scoring failed for job ${saved.id}:`, err);
      }
    }
  }

  if (queryId) {
    updateSearchQueryLastRun(queryId, newJobsAdded, true);
  }

  console.log(
    `[SearchManager] Completed search. Total scraped: ${payload.totalFound}, New added: ${newJobsAdded}, Duplicates skipped: ${duplicatesSkipped}`
  );

  return {
    source: options.source,
    totalScraped: payload.totalFound,
    newJobsAdded,
    duplicatesSkipped,
  };
}
