/**
 * Indeed Job Discovery Adapter.
 *
 * Implements JobDiscoveryAdapter for Indeed search and pagination.
 */

import type { Page } from "playwright";
import type { JobDiscoveryAdapter, RawJobPosting, SearchOptions } from "../types";
import { actionDelay } from "@/lib/utils/delay";

export class IndeedDiscoveryAdapter implements JobDiscoveryAdapter {
  readonly platform = "indeed";

  async scrape(page: Page, options: SearchOptions): Promise<RawJobPosting[]> {
    const keywords = encodeURIComponent(options.keywords);
    const location = encodeURIComponent(options.location || "Remote");
    const maxPages = options.maxPages || 2;
    const scrapedAt = new Date().toISOString();
    const jobs: RawJobPosting[] = [];

    for (let p = 0; p < maxPages; p++) {
      const start = p * 10;
      const searchUrl = `https://www.indeed.com/jobs?q=${keywords}&l=${location}&start=${start}`;

      console.log(`[IndeedDiscovery] Navigating to page ${p + 1}: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
      await actionDelay();

      const cards = await page.$$("div.job_seen_beacon, td.resultContent, div.cardOutline");

      for (const card of cards) {
        try {
          const titleEl = await card.$("h2.jobTitle span, a[data-jk] span, h2.jobTitle a");
          const companyEl = await card.$("[data-testid='company-name'], span.companyName, span.css-63koeb");
          const locationEl = await card.$("[data-testid='text-location'], div.companyLocation, div.css-1p0sjhy");
          const salaryEl = await card.$("div.salary-snippet-container, div.estimated-salary");
          const linkEl = await card.$("a[data-jk], h2.jobTitle a");

          const title = titleEl ? (await titleEl.textContent())?.trim() : "";
          const company = companyEl ? (await companyEl.textContent())?.trim() : "";
          const jobLoc = locationEl ? (await locationEl.textContent())?.trim() : "";
          const salary = salaryEl ? (await salaryEl.textContent())?.trim() : undefined;
          const jk = linkEl ? await linkEl.getAttribute("data-jk") : null;
          const href = linkEl ? await linkEl.getAttribute("href") : "";

          if (title && company) {
            const sourceId =
              jk || (href ? href.match(/jk=([a-zA-Z0-9]+)/)?.[1] : null) ||
              `ind-${title.toLowerCase().replace(/\W+/g, "-")}-${company.toLowerCase().replace(/\W+/g, "-")}`;

            const appUrl = jk
              ? `https://www.indeed.com/viewjob?jk=${jk}`
              : href
              ? href.startsWith("http")
                ? href
                : `https://www.indeed.com${href}`
              : undefined;

            jobs.push({
              source: "indeed",
              sourceId,
              title,
              company,
              location: jobLoc || options.location,
              salaryInfo: salary,
              applicationUrl: appUrl,
              postedAt: scrapedAt,
            });
          }
        } catch {
          // Skip card on parsing error
        }
      }
    }

    return jobs;
  }
}
