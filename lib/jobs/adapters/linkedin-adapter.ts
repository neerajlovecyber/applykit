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
    const seenJobIds = new Set<string>();

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const startOffset = pageNum * 25;
      const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${keywords}&location=${location}${easyApplyParam}&start=${startOffset}`;

      console.log(`[LinkedInDiscovery] Navigating to page ${pageNum + 1}: ${searchUrl}`);
      try {
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
      } catch (err) {
        console.warn(`[LinkedInDiscovery] Page navigation error on page ${pageNum + 1}:`, err);
      }
      await actionDelay();

      // Wait for job listings container or cards (supports both authenticated and public guest layouts)
      await page
        .waitForSelector(
          "ul.jobs-search__results-list > li, li.jobs-search-results__list-item, li[data-occludable-job-id], div.job-card-job-posting-card-wrapper, div.job-card-container, div.base-card, .jobs-search-no-results",
          { timeout: 10000 }
        )
        .catch(() => console.debug(`[LinkedInDiscovery] Notice: Wait timeout for job cards on page ${pageNum + 1}`));

      // Scroll both window and any inner scrollable job list container (in authenticated LinkedIn SPA)
      await page.evaluate(() => {
        const innerList = document.querySelector(".jobs-search-results-list, .scaffold-layout__list-container, ul.jobs-search__results-list");
        if (innerList) {
          innerList.scrollBy(0, 1000);
        }
        window.scrollBy(0, 1000);
      });
      await randomDelay(800, 1500);

      // Extract job cards across authenticated and public guest selectors
      const cardHandles = await page.$$(
        "ul.jobs-search__results-list > li, li.jobs-search-results__list-item, li[data-occludable-job-id], div.job-card-job-posting-card-wrapper, div.job-card-container, div.base-card"
      );

      console.log(`[LinkedInDiscovery] Found ${cardHandles.length} potential job card elements on page ${pageNum + 1}`);

      for (const card of cardHandles) {
        try {
          const titleEl = await card.$(
            ".base-search-card__title, .job-card-list__title, a.job-card-container__link, a[data-control-name='job_card_click'], h3, strong"
          );
          const companyEl = await card.$(
            ".base-search-card__subtitle, .job-card-container__company-name, .artdeco-entity-lockup__subtitle, .job-card-container__primary-description, h4"
          );
          const locationEl = await card.$(
            ".job-search-card__location, .job-card-container__metadata-item, .artdeco-entity-lockup__caption"
          );
          const linkEl = await card.$(
            "a.base-card__full-link, a.job-card-list__title, a.job-card-container__link, a.job-card-list__title--link, a[data-control-name='job_card_click']"
          );

          const title = titleEl ? (await titleEl.textContent())?.trim() : "";
          const company = companyEl ? (await companyEl.textContent())?.trim() : "";
          const jobLoc = locationEl ? (await locationEl.textContent())?.trim() : "";
          const href = linkEl ? await linkEl.getAttribute("href") : "";

          // Extract job ID from data attributes, child attributes, or href
          const cardJobId =
            (await card.getAttribute("data-job-id")) ||
            (await card.getAttribute("data-occludable-job-id"));

          const innerJobId = !cardJobId
            ? await card.$eval("[data-job-id]", (el: any) => el.getAttribute("data-job-id")).catch(() => null)
            : null;

          const urnJobId = !cardJobId && !innerJobId
            ? await card.$eval("[data-entity-urn]", (el: any) => {
                const urn = el.getAttribute("data-entity-urn");
                const m = urn?.match(/urn:li:fsd_jobPosting:(\d+)/);
                return m ? m[1] : null;
              }).catch(() => null)
            : null;

          const hrefMatch = href?.match(/\/view\/(\d+)/) || href?.match(/currentJobId=(\d+)/) || href?.match(/-(\d{8,})/);
          const rawJobId = cardJobId || innerJobId || urnJobId || (hrefMatch ? hrefMatch[1] : null);

          // Build canonical application URL
          let applicationUrl: string | undefined;
          if (rawJobId && /^\d+$/.test(rawJobId)) {
            applicationUrl = `https://www.linkedin.com/jobs/view/${rawJobId}/`;
          } else if (href && href !== "#" && !href.startsWith("javascript:")) {
            applicationUrl = href.startsWith("http") ? href : `https://www.linkedin.com${href}`;
          }

          // Do NOT record jobs that have no valid application URL
          if (!applicationUrl) {
            continue;
          }

          if (!title || !company) {
            continue;
          }

          const sourceId = rawJobId || (hrefMatch ? hrefMatch[1] : null) || `ln-${title.toLowerCase().replace(/\W+/g, "-")}-${company.toLowerCase().replace(/\W+/g, "-")}`;

          if (!seenJobIds.has(sourceId)) {
            seenJobIds.add(sourceId);
            jobs.push({
              source: "linkedin",
              sourceId,
              title,
              company,
              location: jobLoc || options.location,
              applicationUrl,
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
