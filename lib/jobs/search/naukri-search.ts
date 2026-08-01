/**
 * Naukri Job Search Scraper using Playwright with Multi-Tab Parallel Search.
 *
 * Inspired by Naukri-autoapply-bot: opens keyword search categories
 * across parallel browser tabs to find more jobs faster.
 */

import { chromium, type Browser } from "playwright";
import type { RawJobPosting, SearchOptions, SearchResultPayload } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";

export async function searchNaukriJobs(options: SearchOptions): Promise<SearchResultPayload> {
  const keywordsList = options.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const location = (options.location || "bangalore").toLowerCase().replace(/\s+/g, "-");
  const maxPages = options.maxPages || 2;
  const scrapedAt = new Date().toISOString();
  const allJobs: RawJobPosting[] = [];

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

    // Multi-tab parallel search across all keyword categories
    const tabPromises = keywordsList.map(async (kw) => {
      const page = await context.newPage();
      const kwSlug = kw.toLowerCase().replace(/\s+/g, "-");
      const pageJobs: RawJobPosting[] = [];

      try {
        for (let p = 1; p <= maxPages; p++) {
          const searchUrl = p === 1
            ? `https://www.naukri.com/${kwSlug}-jobs-in-${location}`
            : `https://www.naukri.com/${kwSlug}-jobs-in-${location}-${p}`;

          console.log(`[NaukriSearch Tab: "${kw}"] Navigating to page ${p}: ${searchUrl}`);
          await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
          await randomDelay(1000, 2000);

          // Extract 2026 Naukri redesign tuple selectors (from reference Naukri bot README)
          const tuples = await page.$$("div.srp-jobtuple-wrapper > div.cust-job-tuple, article.jobTuple, div.tuple");

          for (const tuple of tuples) {
            try {
              const titleEl = await tuple.$("a.title, h2 a, a.job-title");
              const compEl = await tuple.$("a.comp-name, .subTitle, a.company-name");
              const locEl = await tuple.$("span.loc-wrap, span.location, .loc");
              const expEl = await tuple.$("span.exp-wrap, span.exp, .exp");
              const salEl = await tuple.$("span.sal-wrap, span.salary, .sal");

              const title = titleEl ? (await titleEl.textContent())?.trim() : "";
              const company = compEl ? (await compEl.textContent())?.trim() : "";
              const loc = locEl ? (await locEl.textContent())?.trim() : "";
              const exp = expEl ? (await expEl.textContent())?.trim() : "";
              const sal = salEl ? (await salEl.textContent())?.trim() : "";
              const href = titleEl ? await titleEl.getAttribute("href") : "";

              if (title && company) {
                const match = href?.match(/-(\d+)\?/);
                const sourceId = match ? match[1] : `nk-${title.toLowerCase().replace(/\W+/g, "-")}-${company.toLowerCase().replace(/\W+/g, "-")}`;

                pageJobs.push({
                  source: "naukri",
                  sourceId,
                  title,
                  company,
                  location: loc || options.location,
                  seniority: exp,
                  salaryInfo: sal,
                  applicationUrl: href || undefined,
                  postedAt: scrapedAt,
                });
              }
            } catch {
              // skip malformed card
            }
          }
        }
      } catch (err) {
        console.error(`[NaukriSearch Tab: "${kw}"] Failed:`, err);
      } finally {
        await page.close();
      }

      return pageJobs;
    });

    const results = await Promise.all(tabPromises);
    for (const jobBatch of results) {
      allJobs.push(...jobBatch);
    }

    return {
      source: "naukri",
      query: options,
      jobs: allJobs,
      totalFound: allJobs.length,
      scrapedAt,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[NaukriSearch] Multi-tab search failed:", errorMsg);
    return {
      source: "naukri",
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
