/**
 * Indeed Job Search Scraper (Backwards Compatibility Wrapper).
 *
 * Delegates to IndeedDiscoveryAdapter and the shared browser pool.
 */

import type { SearchOptions, SearchResultPayload } from "../types";
import { IndeedDiscoveryAdapter } from "../adapters/indeed-adapter";
import { acquirePage, releasePage } from "@/lib/execution/browser-pool";

export async function searchIndeedJobs(options: SearchOptions): Promise<SearchResultPayload> {
  const adapter = new IndeedDiscoveryAdapter();
  const scrapedAt = new Date().toISOString();
  let page: any = null;

  try {
    page = await acquirePage(true);
    const jobs = await adapter.scrape(page, options);
    return {
      source: "indeed",
      query: options,
      jobs,
      totalFound: jobs.length,
      scrapedAt,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[IndeedSearch] Failed:", errorMsg);
    return {
      source: "indeed",
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
