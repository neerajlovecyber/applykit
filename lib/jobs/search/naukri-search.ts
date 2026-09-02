/**
 * Naukri Job Search Scraper (Backwards Compatibility Wrapper).
 *
 * Delegates to NaukriDiscoveryAdapter and the shared browser pool.
 */

import type { SearchOptions, SearchResultPayload } from "../types";
import { NaukriDiscoveryAdapter } from "../adapters/naukri-adapter";
import { acquirePage, releasePage } from "@/lib/execution/browser-pool";

export async function searchNaukriJobs(options: SearchOptions): Promise<SearchResultPayload> {
  const adapter = new NaukriDiscoveryAdapter();
  const scrapedAt = new Date().toISOString();
  let page: any = null;

  try {
    page = await acquirePage(true);
    const jobs = await adapter.scrape(page, options);
    return {
      source: "naukri",
      query: options,
      jobs,
      totalFound: jobs.length,
      scrapedAt,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[NaukriSearch] Failed:", errorMsg);
    return {
      source: "naukri",
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
