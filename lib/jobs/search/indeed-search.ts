/**
 * Indeed Job Search Scraper using Playwright.
 */

import { chromium, type Browser } from "playwright";
import type { RawJobPosting, SearchOptions, SearchResultPayload } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";

export async function searchIndeedJobs(options: SearchOptions): Promise<SearchResultPayload> {
  const keywords = encodeURIComponent(options.keywords);
  const location = encodeURIComponent(options.location || "Remote");
  const maxPages = options.maxPages || 2;
  const scrapedAt = new Date().toISOString();
  const jobs: RawJobPosting[] = [];

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
    });

    const page = await context.newPage();

    for (let p = 0; p < maxPages; p++) {
      const start = p * 10;
      const searchUrl = `https://www.indeed.com/jobs?q=${keywords}&l=${location}&start=${start}`;

      console.log(`[IndeedSearch] Navigating to page ${p + 1}: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await actionDelay();

      const cards = await page.$$("div.job_seen_beacon, td.resultContent, div.cardOutline");

      for (const card of cards) {
        try {
          const titleEl = await card.$("h2.jobTitle, a.jcs-JobTitle");
          const compEl = await card.$("[data-testid='company-name'], span.companyName");
          const locEl = await card.$("[data-testid='text-location'], div.companyLocation");
          const salEl = await card.$("div.metadata.salary-snippet-container, div.salary-snippet-container");

          const title = titleEl ? (await titleEl.textContent())?.trim() : "";
          const company = compEl ? (await compEl.textContent())?.trim() : "";
          const loc = locEl ? (await locEl.textContent())?.trim() : "";
          const sal = salEl ? (await salEl.textContent())?.trim() : "";
          const href = titleEl ? await titleEl.getAttribute("href") : "";

          if (title && company) {
            const match = href?.match(/jk=([a-f0-9]+)/);
            const sourceId = match ? match[1] : `ind-${title.toLowerCase().replace(/\W+/g, "-")}-${company.toLowerCase().replace(/\W+/g, "-")}`;

            jobs.push({
              source: "indeed",
              sourceId,
              title,
              company,
              location: loc || options.location,
              salaryInfo: sal,
              applicationUrl: href ? (href.startsWith("http") ? href : `https://www.indeed.com${href}`) : undefined,
              postedAt: scrapedAt,
            });
          }
        } catch {
          // skip card
        }
      }
    }

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
    if (browser) await browser.close();
  }
}
