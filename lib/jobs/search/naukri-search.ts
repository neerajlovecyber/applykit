/**
 * Naukri Job Search Scraper using Hybrid API & Multi-Tab Parallel Browser Search.
 *
 * Adapted from Naukri-Automation reference repository & Naukri-autoapply-bot.
 */

import { chromium, type Browser } from "playwright";
import type { RawJobPosting, SearchOptions, SearchResultPayload } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";
import { searchNaukriJobsAPI } from "@/lib/execution/platforms/naukri-api";
import { getPlatformById } from "@/lib/main/db-queries";

export async function searchNaukriJobs(options: SearchOptions): Promise<SearchResultPayload> {
  const keywordsList = options.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const location = options.location || "bangalore";
  const locSlug = location.toLowerCase().replace(/\s+/g, "-");
  const maxPages = options.maxPages || 2;
  const scrapedAt = new Date().toISOString();
  const allJobs: RawJobPosting[] = [];
  const seenJobIds = new Set<string>();

  // Fetch stored auth token for Naukri if available
  const platform = getPlatformById("naukri");
  const authToken = platform?.auth_token || undefined;

  // 1. Try Direct API Search first for high speed and rich metadata
  try {
    for (const kw of keywordsList) {
      for (let p = 1; p <= maxPages; p++) {
        const apiData = await searchNaukriJobsAPI(kw, location, p, authToken, {
          experienceYears: options.experienceYears,
          jobAgeDays: options.jobAgeDays,
          workMode: options.workMode,
        });
        if (apiData?.jobDetails && Array.isArray(apiData.jobDetails)) {
          for (const item of apiData.jobDetails) {
            const sourceId = String(item.jobId || "");
            if (sourceId && !seenJobIds.has(sourceId)) {
              seenJobIds.add(sourceId);
              allJobs.push({
                source: "naukri",
                sourceId,
                title: item.title || "",
                company: item.companyName || "",
                location: location,
                seniority: item.minimumExperience !== undefined ? `${item.minimumExperience}+ yrs` : undefined,
                salaryInfo:
                  item.minimumSalary || item.maximumSalary
                    ? `${item.minimumSalary || 0} - ${item.maximumSalary || 0} INR`
                    : undefined,
                description: item.jobDescription,
                applicationUrl: `https://www.naukri.com/job-listings-${sourceId}`,
                postedAt: item.createdDate || scrapedAt,
                rawData: item,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.debug("[NaukriSearch] API search attempt failed or blocked, proceeding with browser fallback:", err);
  }

  // If API returned sufficient results, return immediately
  if (allJobs.length > 0) {
    return {
      source: "naukri",
      query: options,
      jobs: allJobs,
      totalFound: allJobs.length,
      scrapedAt,
    };
  }

  // 2. Browser Multi-Tab DOM Scraping Fallback
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/139.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
    });

    const tabPromises = keywordsList.map(async (kw) => {
      const page = await context.newPage();
      const pageJobs: RawJobPosting[] = [];

      try {
        for (let p = 1; p <= maxPages; p++) {
          const encKw = encodeURIComponent(kw);
          const encL = location ? encodeURIComponent(location) : "";

          const extraQuery: string[] = [];
          if (options.experienceYears !== undefined && options.experienceYears >= 0) {
            extraQuery.push(`experience=${options.experienceYears}`);
          }
          if (options.jobAgeDays) {
            extraQuery.push(`jobAge=${options.jobAgeDays}`);
            extraQuery.push(`freshness=${options.jobAgeDays}`);
          }
          if (options.workMode) {
            if (options.workMode === "remote") extraQuery.push("wfhType=2");
            else if (options.workMode === "hybrid") extraQuery.push("wfhType=3");
            else if (options.workMode === "onSite") extraQuery.push("wfhType=1");
          }

          const qStr = extraQuery.length > 0 ? `&${extraQuery.join("&")}` : "";
          const searchUrl = `https://www.naukri.com/job-search?k=${encKw}${encL ? `&l=${encL}` : ""}&pageNo=${p}${qStr}`;

          console.log(`[NaukriSearch Tab: "${kw}"] Navigating to page ${p}: ${searchUrl}`);
          await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
          await randomDelay(1000, 2000);

          // Extract Naukri tuple selectors
          const tuples = await page.$$(
            "div.srp-jobtuple-wrapper, article.jobTuple, div.cust-job-tuple, div.tuple, div.jobTuple, div[data-job-id], article.srp-jobtuple"
          );

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
                const sourceId = match
                  ? match[1]
                  : `nk-${title.toLowerCase().replace(/\W+/g, "-")}-${company.toLowerCase().replace(/\W+/g, "-")}`;

                if (!seenJobIds.has(sourceId)) {
                  seenJobIds.add(sourceId);
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
              }
            } catch {
              // skip malformed element
            }
          }
        }
      } catch (err) {
        console.error(`[NaukriSearch Tab: "${kw}"] Browser scrap error:`, err);
      } finally {
        await page.close();
      }

      return pageJobs;
    });

    const results = await Promise.all(tabPromises);
    for (const batch of results) {
      allJobs.push(...batch);
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
    console.error("[NaukriSearch] Hybrid search failed:", errorMsg);
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
