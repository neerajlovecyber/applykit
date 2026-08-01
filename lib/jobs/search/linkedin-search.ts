/**
 * LinkedIn Job Search Scraper using Playwright.
 *
 * Discovers jobs on LinkedIn by keyword, location, and Easy Apply filters.
 * Inspired by Auto_job_applier_linkedIn search modules.
 */

import { chromium, type Browser, type Page } from "playwright";
import type { RawJobPosting, SearchOptions, SearchResultPayload } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";

export async function searchLinkedInJobs(options: SearchOptions): Promise<SearchResultPayload> {
  const keywords = encodeURIComponent(options.keywords);
  const location = encodeURIComponent(options.location || "Remote");
  const easyApplyParam = options.easyApplyOnly ? "&f_AL=true" : "";
  const maxPages = options.maxPages || 2;

  const scrapedAt = new Date().toISOString();
  const jobs: RawJobPosting[] = [];

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const startOffset = pageNum * 25;
      const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${keywords}&location=${location}${easyApplyParam}&start=${startOffset}`;

      console.log(`[LinkedInSearch] Navigating to page ${pageNum + 1}: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
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
            // Extract job ID from URL or generate fallback
            const match = href?.match(/view\/(\d+)/) || href?.match(/currentJobId=(\d+)/);
            const sourceId = match ? match[1] : `ln-${title.toLowerCase().replace(/\W+/g, "-")}-${company.toLowerCase().replace(/\W+/g, "-")}`;

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
        } catch (err) {
          // Skip malformed card
        }
      }
    }

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
    if (browser) await browser.close();
  }
}
