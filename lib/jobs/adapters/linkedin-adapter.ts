/**
 * LinkedIn Job Discovery Adapter.
 *
 * Implements JobDiscoveryAdapter for LinkedIn search and pagination.
 */

import type { Page } from "playwright";
import type { JobDiscoveryAdapter, RawJobPosting, SearchOptions } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";

export class LinkedInDiscoveryAdapter implements JobDiscoveryAdapter {
  readonly platform = "linkedin";

  async scrape(page: Page, options: SearchOptions): Promise<RawJobPosting[]> {
    const keywords = encodeURIComponent(options.keywords);
    const location = encodeURIComponent(options.location || "Remote");
    const easyApplyParam = options.easyApplyOnly ? "&f_AL=true" : "";
    const maxPages = options.maxPages || 2;
    const scrapedAt = new Date().toISOString();
    const jobs: RawJobPosting[] = [];

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const startOffset = pageNum * 25;
      const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${keywords}&location=${location}${easyApplyParam}&start=${startOffset}`;

      console.log(`[LinkedInDiscovery] Navigating to page ${pageNum + 1}: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
      await actionDelay();

      // Scroll to trigger lazy loading of job cards
      await page.evaluate(() => window.scrollBy(0, 1000));
      await randomDelay(800, 1500);

      // Extract job cards
      const cardHandles = await page.$$("ul.jobs-search__results-list > li, div.job-card-container, div.base-card");

      for (const card of cardHandles) {
        try {
          const titleEl = await card.$(".base-search-card__title, .job-card-list__title, h3");
          const companyEl = await card.$(".base-search-card__subtitle, .job-card-container__company-name, h4");
          const locationEl = await card.$(".job-search-card__location, .job-card-container__metadata-item");
          const linkEl = await card.$("a.base-card__full-link, a.job-card-list__title, a.job-card-container__link");

          const title = titleEl ? (await titleEl.textContent())?.trim() : "";
          const company = companyEl ? (await companyEl.textContent())?.trim() : "";
          const jobLoc = locationEl ? (await locationEl.textContent())?.trim() : "";
          const href = linkEl ? await linkEl.getAttribute("href") : "";

          if (title && company) {
            const match = href?.match(/view\/(\d+)/) || href?.match(/currentJobId=(\d+)/);
            const sourceId = match
              ? match[1]
              : `ln-${title.toLowerCase().replace(/\W+/g, "-")}-${company.toLowerCase().replace(/\W+/g, "-")}`;

            jobs.push({
              source: "linkedin",
              sourceId,
              title,
              company,
              location: jobLoc || options.location,
              applicationUrl: href ? (href.startsWith("http") ? href : `https://www.linkedin.com${href}`) : undefined,
              postedAt: scrapedAt,
            });
          }
        } catch {
          // Skip malformed card
        }
      }
    }

    return jobs;
  }
}
