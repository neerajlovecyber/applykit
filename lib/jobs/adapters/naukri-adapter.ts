/**
 * Naukri Job Discovery Adapter.
 *
 * Implements JobDiscoveryAdapter with Hybrid Direct API & DOM Fallback.
 */

import type { Page } from "playwright";
import type { JobDiscoveryAdapter, RawJobPosting, SearchOptions } from "../types";
import { randomDelay } from "@/lib/utils/delay";
import { searchNaukriJobsAPI } from "./naukri-api";
import { getPlatformById } from "@/lib/db";

export class NaukriDiscoveryAdapter implements JobDiscoveryAdapter {
  readonly platform = "naukri";

  async scrape(page: Page, options: SearchOptions): Promise<RawJobPosting[]> {
    const keywordsList = options.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const location = options.location?.trim() || ""; // empty = search all-India
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
      console.debug("[NaukriDiscovery] API search attempt failed or blocked, proceeding with browser fallback:", err);
    }

    // If API returned sufficient results, return immediately
    if (allJobs.length > 0) {
      return allJobs;
    }

    // 2. Browser DOM Scraping Fallback using shared Page
    for (const kw of keywordsList) {
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

        console.log(`[NaukriDiscovery: "${kw}"] Navigating to page ${p}: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

        // Naukri SRP is a React SPA — wait for job cards to render (up to 10s)
        await page
          .waitForSelector(
            "div.srp-jobtuple-wrapper, article.jobTuple, div[data-job-id], div.cust-job-tuple",
            { timeout: 10000 }
          )
          .catch(() => console.debug(`[NaukriDiscovery: "${kw}"] No job cards found on page ${p} within 10s`));
        await randomDelay(800, 1500);

        // Extract Naukri tuple selectors — use broad class-contains to handle obfuscation
        const tuples = await page.$$(
          "div.srp-jobtuple-wrapper, article.jobTuple, div[class*='jobTuple'], div[data-job-id], div.cust-job-tuple"
        );

        for (const tuple of tuples) {
          try {
            const titleEl = await tuple.$(
              "a.title, a[class*='title'], .row1 a, [data-testid='job-title'], a.jobtitle"
            );
            const compEl = await tuple.$(
              "a.subTitle, a.comp-name, a[class*='comp-name'], [data-testid='company-name'], .comp-dtls-wrap a, .companyInfo a"
            );
            const expEl = await tuple.$(
              "span.exp, li[class*='experience'], .expwdth, [data-testid='experience'], span[class*='exp']"
            );
            const salEl = await tuple.$(
              "span.sal, li[class*='salary'], .salwdth, [data-testid='salary'], span[class*='sal']"
            );
            const locEl = await tuple.$(
              "span.loc, li[class*='location'], .locwdth, [data-testid='location'], span[class*='loc'], .locWdth"
            );
            const descEl = await tuple.$(
              "div.job-desc, div.job-description, .job-desc-snippet, .ellipsis, .jd-desc"
            );

            const title = titleEl ? (await titleEl.textContent())?.trim() : "";
            const company = compEl ? (await compEl.textContent())?.trim() : "";
            const href = titleEl ? await titleEl.getAttribute("href") : "";
            const exp = expEl ? (await expEl.textContent())?.trim() : undefined;
            const salary = salEl ? (await salEl.textContent())?.trim() : undefined;
            const loc = locEl ? (await locEl.textContent())?.trim() : location;
            const desc = descEl ? (await descEl.textContent())?.trim() : undefined;

            const tupleJobId = (await tuple.getAttribute("data-job-id")) || (await tuple.getAttribute("id"));
            const match = href?.match(/-(\d+)(?:\?|$)/) || href?.match(/job-listings-.*?(\d{6,})/);
            const sourceId =
              tupleJobId ||
              (match ? match[1] : null) ||
              `nk-${title?.toLowerCase().replace(/\W+/g, "-")}-${company?.toLowerCase().replace(/\W+/g, "-")}`;

            if (title && company && !seenJobIds.has(sourceId)) {
              seenJobIds.add(sourceId);
              allJobs.push({
                source: "naukri",
                sourceId,
                title,
                company,
                location: loc || location || options.location,
                seniority: exp,
                salaryInfo: salary,
                description: desc,
                applicationUrl: href ? (href.startsWith("http") ? href : `https://www.naukri.com${href}`) : undefined,
                postedAt: scrapedAt,
              });
            }
          } catch {
            // Skip invalid job tuple
          }
        }
      }
    }

    return allJobs;
  }
}
