/**
 * LinkedIn Job Discovery Adapter.
 *
 * Implements JobDiscoveryAdapter for LinkedIn search and pagination.
 */

import type { Page } from "playwright";
import type { JobDiscoveryAdapter, RawJobPosting, SearchOptions } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";

function buildLinkedInFilterParams(options: SearchOptions): string {
  let params = "";
  const f = options.filters || {};

  // 1. Easy Apply filter (f_AL=true) - from EasyApplyJobsBot
  const isEasyApply = options.easyApplyOnly ?? f.easyApplyOnly ?? true;
  if (isEasyApply) {
    params += "&f_AL=true";
  }

  // 2. Date Posted (f_TPR)
  // LinkedIn codes: r86400=Past 24h, r604800=Past week, r2592000=Past month
  const dp = f.datePosted ?? f.jobAgeDays ?? options.jobAgeDays ?? "past24Hours";
  if (dp === "past24Hours" || dp === 1 || dp === "1") {
    params += "&f_TPR=r86400";
  } else if (dp === "pastWeek" || dp === 7 || dp === "7" || dp === 3 || dp === "3") {
    params += "&f_TPR=r604800";
  } else if (dp === "pastMonth" || dp === 30 || dp === "30" || dp === 14 || dp === 15 || dp === "15") {
    params += "&f_TPR=r2592000";
  }

  // 3. Under 10 applicants (f_EA=true)
  if (f.under10Applicants) {
    params += "&f_EA=true";
  }

  // 4. Experience Level (f_E)
  // LinkedIn codes: 1=Internship, 2=Entry level, 3=Associate, 4=Mid-Senior, 5=Director, 6=Executive
  const expMap: Record<string, string> = {
    internship: "1",
    entry: "2",
    entrylevel: "2",
    associate: "3",
    midsenior: "4",
    director: "5",
    executive: "6",
  };
  const rawYears = f.experienceYears ?? options.experienceYears;
  const expYears = rawYears !== undefined && rawYears !== null ? Number(rawYears) : undefined;
  const exps: string[] = Array.isArray(f.experienceLevel) && f.experienceLevel.length > 0
    ? f.experienceLevel
    : expYears !== undefined && !isNaN(expYears) && expYears >= 0
      ? [expYears <= 1 ? "entry" : expYears <= 4 ? "associate" : expYears <= 7 ? "midsenior" : "director"]
      : [];
  const expCodes = exps
    .map((e) => expMap[e.toLowerCase().replace(/[^a-z]/g, "")])
    .filter(Boolean);
  if (expCodes.length > 0) {
    params += `&f_E=${expCodes.join("%2C")}`;
  }

  // 5. Work Mode / Remote (f_WT)
  // LinkedIn codes: 1=On-site, 2=Remote, 3=Hybrid
  const wmMap: Record<string, string> = {
    onsite: "1",
    remote: "2",
    hybrid: "3",
  };
  const wms: string[] = Array.isArray(f.workMode)
    ? f.workMode
    : options.workMode
      ? [options.workMode]
      : [];
  const wmCodes = wms
    .map((w) => wmMap[w.toLowerCase().replace(/[^a-z]/g, "")])
    .filter(Boolean);
  if (wmCodes.length > 0) {
    params += `&f_WT=${wmCodes.join("%2C")}`;
  }

  // 6. Job Type (f_JT)
  // LinkedIn codes: F=Full-time, P=Part-time, C=Contract, T=Temporary, I=Internship
  const jtMap: Record<string, string> = {
    fulltime: "F",
    parttime: "P",
    contract: "C",
    temporary: "T",
    internship: "I",
  };
  if (Array.isArray(f.jobType)) {
    const jtCodes = f.jobType
      .map((j: string) => jtMap[j.toLowerCase().replace(/[^a-z]/g, "")])
      .filter(Boolean);
    if (jtCodes.length > 0) {
      params += `&f_JT=${jtCodes.join("%2C")}`;
    }
  }

  return params;
}

function normalizeLinkedInLocation(loc?: string): string {
  const trimmed = (loc || "").trim();
  if (!trimmed || /remote/i.test(trimmed)) {
    return "Remote";
  }

  const lower = trimmed.toLowerCase();
  // If user already specified country or state comma (e.g. "Delhi, India" or "Austin, TX"), keep as is
  if (lower.includes("india") || lower.includes("usa") || lower.includes("united states") || lower.includes(",")) {
    return trimmed;
  }

  const indianMap: Record<string, string> = {
    gurugram: "Gurugram, Haryana, India",
    gurgaon: "Gurugram, Haryana, India",
    delhi: "Delhi NCR, India",
    "delhi ncr": "Delhi NCR, India",
    noida: "Noida, Uttar Pradesh, India",
    bangalore: "Bengaluru, Karnataka, India",
    bengaluru: "Bengaluru, Karnataka, India",
    hyderabad: "Hyderabad, Telangana, India",
    pune: "Pune, Maharashtra, India",
    mumbai: "Mumbai, Maharashtra, India",
    chennai: "Chennai, Tamil Nadu, India",
    kolkata: "Kolkata, West Bengal, India",
  };

  const exactMatch = indianMap[lower];
  if (exactMatch) return exactMatch;

  for (const [k, v] of Object.entries(indianMap)) {
    if (lower.includes(k)) return v;
  }

  return `${trimmed}, India`;
}

export class LinkedInDiscoveryAdapter implements JobDiscoveryAdapter {
  readonly platform = "linkedin";

  async scrape(page: Page, options: SearchOptions): Promise<RawJobPosting[]> {
    const keywords = encodeURIComponent(options.keywords);
    const location = encodeURIComponent(normalizeLinkedInLocation(options.location));
    const filterParams = buildLinkedInFilterParams(options);
    const maxPages = options.maxPages || 2;
    const scrapedAt = new Date().toISOString();
    const jobs: RawJobPosting[] = [];
    const seenJobIds = new Set<string>();

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const startOffset = pageNum * 25;
      const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${keywords}&location=${location}${filterParams}&start=${startOffset}`;

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
