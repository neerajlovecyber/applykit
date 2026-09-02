/**
 * LinkedIn Job Search Scraper (Backwards Compatibility Wrapper).
 *
 * Delegates to LinkedInDiscoveryAdapter and the shared browser pool.
 */

import type { SearchOptions, SearchResultPayload } from "../types";
import { LinkedInDiscoveryAdapter } from "../adapters/linkedin-adapter";
import { acquirePage, releasePage } from "@/lib/execution/browser-pool";

export async function searchLinkedInJobs(options: SearchOptions): Promise<SearchResultPayload> {
  const adapter = new LinkedInDiscoveryAdapter();
  const scrapedAt = new Date().toISOString();
  let page: any = null;

  try {
    page = await acquirePage(true);
    const jobs = await adapter.scrape(page, options);
    return {
      source: "linkedin",
      query: options,
      jobs,
      totalFound: jobs.length,
      scrapedAt,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[LinkedInSearch] Failed:", errorMsg);
    return {
      source: "linkedin",
      query: options,
      jobs: [],
      totalFound: 0,
      scrapedAt,
      error: errorMsg,
    };
  } finally {
    if (page) {
      await releasePage(page);
    }
  }
}
