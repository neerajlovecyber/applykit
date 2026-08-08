/**
 * LinkedIn Easy Apply Platform Applier using Playwright.
 *
 * Adapted from:
 *   - GodsScion/Auto_job_applier_linkedIn (runAiBot.py) — search, filter, job card scraping, blacklist
 *   - autoapplycv linkedin-auto-apply.js — wizard step loop
 *
 * Key concepts imported from runAiBot.py:
 *   - apply_filters()          → buildSearchUrl() + applySearchFilters()
 *   - get_job_main_details()   → scrapeJobCards()
 *   - get_job_description()    → extractJobDescription()
 *   - Easy Apply wizard loop   → apply() (existing, enhanced)
 *   - runBatchApply()          → new entry point for auto-apply runs
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay, randomDelay } from "@/lib/utils/delay";
import { isLoggedInLinkedIn, loginLinkedIn } from "./linkedin-login";
import { join } from "path";
import { app } from "electron";
import { mkdirSync } from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LinkedInSearchFilters {
  datePosted?: "past24Hours" | "pastWeek" | "pastMonth" | "anyTime";
  experienceLevel?: Array<"internship" | "entryLevel" | "associate" | "midSeniorLevel" | "director" | "executive">;
  jobType?: Array<"fullTime" | "partTime" | "contract" | "temporary" | "internship" | "volunteer">;
  workMode?: Array<"onSite" | "remote" | "hybrid">;
  easyApplyOnly?: boolean;
  under10Applicants?: boolean;
}

export interface LinkedInBatchApplyOptions {
  username?: string;
  password?: string;
  keywords: string;
  location?: string;
  maxJobs?: number;
  filters?: LinkedInSearchFilters;
  pauseBeforeSubmit?: boolean;
  profileId: string;
  /** Called with progress updates as jobs are processed */
  onProgress?: (result: BatchJobResult) => void;
}

export interface BatchJobResult {
  jobId: string;
  linkedInJobId?: string;
  title: string;
  company: string;
  location?: string;
  status: "submitted" | "pending_review" | "failed" | "skipped";
  success: boolean;
  fieldsFilled?: number;
  errorMessage?: string;
  screenshotPath?: string;
}

export interface BatchApplyResult {
  processed: number;
  applied: number;
  skipped: number;
  failed: number;
  results: BatchJobResult[];
}

// LinkedIn filter codes (from runAiBot.py config/search.py patterns)
const EXPERIENCE_CODES: Record<string, string> = {
  internship: "1",
  entryLevel: "2",
  associate: "3",
  midSeniorLevel: "4",
  director: "5",
  executive: "6",
};
const JOB_TYPE_CODES: Record<string, string> = {
  fullTime: "F",
  partTime: "P",
  contract: "C",
  temporary: "T",
  internship: "I",
  volunteer: "V",
};
const WORK_MODE_CODES: Record<string, string> = {
  onSite: "1",
  remote: "2",
  hybrid: "3",
};
const DATE_POSTED_CODES: Record<string, string> = {
  past24Hours: "r86400",
  pastWeek: "r604800",
  pastMonth: "r2592000",
  anyTime: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a LinkedIn jobs search URL with filter params.
 * Mirrors the pattern from apply_filters() → search URL construction in runAiBot.py.
 */
function buildLinkedInSearchUrl(
  keywords: string,
  location: string = "",
  filters: LinkedInSearchFilters = {}
): string {
  const params = new URLSearchParams();
  params.set("keywords", keywords);
  if (location) params.set("location", location);
  if (filters.easyApplyOnly) params.set("f_AL", "true");
  if (filters.under10Applicants) params.set("f_EA", "true");
  if (filters.datePosted && DATE_POSTED_CODES[filters.datePosted]) {
    params.set("f_TPR", DATE_POSTED_CODES[filters.datePosted]);
  }
  if (filters.experienceLevel?.length) {
    params.set("f_E", filters.experienceLevel.map((e) => EXPERIENCE_CODES[e]).join(","));
  }
  if (filters.jobType?.length) {
    params.set("f_JT", filters.jobType.map((t) => JOB_TYPE_CODES[t]).join(","));
  }
  if (filters.workMode?.length) {
    params.set("f_WT", filters.workMode.map((m) => WORK_MODE_CODES[m]).join(","));
  }
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LinkedInApplier Class
// ─────────────────────────────────────────────────────────────────────────────

export class LinkedInApplier implements PlatformApplier {
  readonly platformId = "linkedin";

  // ── Single-Job Apply (existing + enhanced) ──────────────────────────────

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    console.log(`[LinkedInApplier] Starting application for job: ${options.jobUrl}`);

    const profile = getProfileById(options.profileId);
    if (!profile) {
      return { success: false, status: "failed", fieldsFilled: 0, fieldsTotal: 0, errorMessage: "Profile not found" };
    }

    const formFiller = new FormFiller(profile);
    let totalFilled = 0;
    let totalFields = 0;

    try {
      // 1. Navigate to job page
      await page.goto(options.jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      // 2. Locate and click "Easy Apply" button
      const applyBtn = await page.$(
        'button.jobs-apply-button, button[aria-label*="Easy Apply"], button:has-text("Easy Apply")'
      );

      if (!applyBtn) {
        return {
          success: false,
          status: "failed",
          fieldsFilled: 0,
          fieldsTotal: 0,
          errorMessage: "Easy Apply button not found on posting.",
        };
      }

      await applyBtn.click();
      await actionDelay();

      // 3. Easy Apply Wizard Multi-Step Loop (adapted from runAiBot.py wizard handling)
      const maxSteps = 10;
      let isCompleted = false;
      let screenshotPath: string | undefined;

      for (let step = 0; step < maxSteps; step++) {
        const modal = await page.$(".jobs-easy-apply-modal, div.artdeco-modal");
        if (!modal) {
          console.log("[LinkedInApplier] Modal closed or submitted.");
          break;
        }

        // Fill current wizard step fields
        const stepSummary = await formFiller.fillCurrentStep(page, ".jobs-easy-apply-modal, div.artdeco-modal");
        totalFilled += stepSummary.fieldsFilled;
        totalFields += stepSummary.fieldsTotal;

        // Check for Submit button
        const submitBtn = await page.$(
          'button[aria-label*="Submit application"], button:has-text("Submit application")'
        );

        if (submitBtn) {
          screenshotPath = await this.captureAuditScreenshot(page, options.applicationId);
          await preSubmitDelay();

          if (options.pauseBeforeSubmit) {
            updateApplicationStatus(options.applicationId, "pending_review", "Awaiting user approval before final submit");
            updateApplicationFillDetails(options.applicationId, {
              fields_filled: totalFilled,
              fields_total: totalFields,
              screenshot_path: screenshotPath,
            });
            return {
              success: true,
              status: "pending_review",
              fieldsFilled: totalFilled,
              fieldsTotal: totalFields,
              screenshotPath,
            };
          }

          await submitBtn.click();
          await actionDelay();
          isCompleted = true;
          break;
        }

        // Click Next or Review
        const nextBtn = await page.$(
          'button[aria-label*="Continue to next step"], button[aria-label*="Review your application"], button:has-text("Next"), button:has-text("Review")'
        );

        if (nextBtn) {
          await nextBtn.click();
          await randomDelay(1500, 3000);
        } else {
          break;
        }
      }

      if (isCompleted) {
        updateApplicationStatus(options.applicationId, "submitted");
        updateApplicationFillDetails(options.applicationId, {
          fields_filled: totalFilled,
          fields_total: totalFields,
          screenshot_path: screenshotPath,
        });

        return {
          success: true,
          status: "submitted",
          fieldsFilled: totalFilled,
          fieldsTotal: totalFields,
          screenshotPath,
        };
      }

      return {
        success: false,
        status: "failed",
        fieldsFilled: totalFilled,
        fieldsTotal: totalFields,
        errorMessage: "Wizard did not reach submit button within step limit.",
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[LinkedInApplier] Execution failed:", errorMsg);
      updateApplicationStatus(options.applicationId, "failed", errorMsg);
      return {
        success: false,
        status: "failed",
        fieldsFilled: totalFilled,
        fieldsTotal: totalFields,
        errorMessage: errorMsg,
      };
    }
  }

  // ── Batch Auto-Apply (new — inspired by runAiBot.py main loop) ──────────

  /**
   * Full LinkedIn auto-apply loop:
   * 1. Login (if credentials provided)
   * 2. Navigate to jobs search URL with filters
   * 3. Scrape job cards from results
   * 4. For each job card: click, check Easy Apply, apply wizard
   *
   * Adapted from runAiBot.py's main job iteration loop.
   */
  async runBatchApply(page: Page, options: LinkedInBatchApplyOptions): Promise<BatchApplyResult> {
    const results: BatchJobResult[] = [];
    let applied = 0;
    let skipped = 0;
    let failed = 0;

    // Step 1: Login
    if (options.username && options.password) {
      console.log(`[LinkedInApplier] Attempting LinkedIn login for ${options.username}...`);
      const loginResult = await loginLinkedIn(page, options.username, options.password);
      if (!loginResult.success) {
        console.warn(`[LinkedInApplier] Login failed: ${loginResult.errorMessage}`);
      }
    } else {
      const loggedIn = await isLoggedInLinkedIn(page);
      if (!loggedIn) {
        await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });
        console.log("[LinkedInApplier] No credentials provided. Waiting 30s for manual login...");
        try {
          await page.waitForURL("**/feed/**", { timeout: 30000 });
        } catch {
          console.warn("[LinkedInApplier] Manual login timeout — proceeding anyway.");
        }
      }
    }

    // Step 2: Build search URL and navigate
    const searchUrl = buildLinkedInSearchUrl(
      options.keywords,
      options.location,
      options.filters ?? {}
    );
    console.log(`[LinkedInApplier] Navigating to search: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await randomDelay(2000, 3500);

    // Step 3: Scrape job cards across paginated results
    const maxJobs = options.maxJobs ?? 10;
    let jobsProcessed = 0;
    let page_num = 1;
    const maxPages = Math.ceil(maxJobs / 25) + 1;

    while (jobsProcessed < maxJobs && page_num <= maxPages) {
      console.log(`[LinkedInApplier] Scraping job cards on page ${page_num}...`);

      // Wait for job list to load
      try {
        await page.waitForSelector(".jobs-search__results-list, ul.scaffold-layout__list-container", {
          timeout: 10000,
        });
      } catch {
        console.warn("[LinkedInApplier] Job list not found on this page.");
        break;
      }

      // Get all job cards on this page
      const jobCards = await page.$$(
        "li.jobs-search__results-list-item, li.scaffold-layout__list-item"
      );
      console.log(`[LinkedInApplier] Found ${jobCards.length} job cards on page ${page_num}.`);

      for (const card of jobCards) {
        if (jobsProcessed >= maxJobs) break;

        let title = "Unknown";
        let company = "Unknown";
        let location = "";
        let linkedInJobId = "";
        let jobUrl = "";

        try {
          // Extract job details from card (get_job_main_details pattern)
          const titleEl = await card.$("a.job-card-list__title, a.job-card-container__link");
          if (titleEl) {
            const rawText = await titleEl.innerText();
            title = rawText.split("\n")[0].trim();
            const href = await titleEl.getAttribute("href");
            if (href) {
              jobUrl = href.startsWith("http") ? href : `https://www.linkedin.com${href}`;
              // Extract job ID from URL: /jobs/view/1234567890/
              const match = href.match(/\/jobs\/view\/(\d+)/);
              if (match) linkedInJobId = match[1];
            }
          }
          const companyEl = await card.$(".artdeco-entity-lockup__subtitle span, .job-card-container__primary-description");
          if (companyEl) company = (await companyEl.innerText()).trim();

          const locationEl = await card.$(".job-card-container__metadata-item, .artdeco-entity-lockup__caption");
          if (locationEl) location = (await locationEl.innerText()).trim();

          // Skip if already applied
          const appliedBadge = await card.$(".job-card-container__footer-job-state");
          if (appliedBadge) {
            const badgeText = await appliedBadge.innerText();
            if (badgeText.toLowerCase().includes("applied")) {
              console.log(`[LinkedInApplier] Skipping already-applied job: ${title}`);
              results.push({ jobId: linkedInJobId, linkedInJobId, title, company, location, status: "skipped", success: false, errorMessage: "Already applied" });
              skipped++;
              jobsProcessed++;
              continue;
            }
          }

          // Click the job card to load details panel
          await titleEl?.click();
          await randomDelay(1200, 2500);

          // Check if Easy Apply button exists in detail panel
          const easyApplyBtn = await page.$(
            'button.jobs-apply-button:has-text("Easy Apply"), button[aria-label*="Easy Apply"]'
          );
          if (!easyApplyBtn) {
            console.log(`[LinkedInApplier] Skipping (no Easy Apply): ${title} @ ${company}`);
            results.push({ jobId: linkedInJobId, linkedInJobId, title, company, location, status: "skipped", success: false, errorMessage: "No Easy Apply button" });
            skipped++;
            jobsProcessed++;
            continue;
          }

          // Apply using the wizard
          if (!jobUrl) {
            jobUrl = page.url();
          }

          const executeOptions: ApplicationExecuteOptions = {
            applicationId: `batch_${linkedInJobId}_${Date.now()}`,
            jobUrl,
            platform: "linkedin",
            profileId: options.profileId,
            pauseBeforeSubmit: options.pauseBeforeSubmit,
          };

          // Click Easy Apply from the detail panel (already visible)
          await easyApplyBtn.click();
          await actionDelay();

          // Run wizard loop inline
          const wizardResult = await this.runEasyApplyWizard(page, executeOptions);

          const jobResult: BatchJobResult = {
            jobId: linkedInJobId,
            linkedInJobId,
            title,
            company,
            location,
            status: wizardResult.status,
            success: wizardResult.success,
            fieldsFilled: wizardResult.fieldsFilled,
            screenshotPath: wizardResult.screenshotPath,
            errorMessage: wizardResult.errorMessage,
          };

          results.push(jobResult);
          options.onProgress?.(jobResult);

          if (wizardResult.success) applied++;
          else failed++;

          jobsProcessed++;
          await randomDelay(2000, 4000);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`[LinkedInApplier] Error on job "${title}": ${errorMsg}`);
          results.push({
            jobId: linkedInJobId,
            linkedInJobId,
            title,
            company,
            location,
            status: "failed",
            success: false,
            errorMessage: errorMsg,
          });
          failed++;
          jobsProcessed++;
        }
      }

      // Try to go to next page
      if (jobsProcessed < maxJobs) {
        const nextPageBtn = await page.$('button[aria-label="Page ' + (page_num + 1) + '"]');
        if (nextPageBtn) {
          await nextPageBtn.click();
          await randomDelay(2000, 3500);
          page_num++;
        } else {
          break;
        }
      }
    }

    console.log(
      `[LinkedInApplier] Batch complete — Applied: ${applied}, Skipped: ${skipped}, Failed: ${failed}`
    );
    return { processed: jobsProcessed, applied, skipped, failed, results };
  }

  // ── Easy Apply Wizard (extracted for reuse in batch loop) ───────────────

  private async runEasyApplyWizard(
    page: Page,
    options: ApplicationExecuteOptions
  ): Promise<ApplicationExecuteResult> {
    const profile = getProfileById(options.profileId);
    if (!profile) {
      return { success: false, status: "failed", fieldsFilled: 0, fieldsTotal: 0, errorMessage: "Profile not found" };
    }

    const formFiller = new FormFiller(profile);
    let totalFilled = 0;
    let totalFields = 0;
    let isCompleted = false;
    let screenshotPath: string | undefined;
    const maxSteps = 10;

    for (let step = 0; step < maxSteps; step++) {
      const modal = await page.$(".jobs-easy-apply-modal, div.artdeco-modal");
      if (!modal) break;

      const stepSummary = await formFiller.fillCurrentStep(page, ".jobs-easy-apply-modal, div.artdeco-modal");
      totalFilled += stepSummary.fieldsFilled;
      totalFields += stepSummary.fieldsTotal;

      const submitBtn = await page.$(
        'button[aria-label*="Submit application"], button:has-text("Submit application")'
      );

      if (submitBtn) {
        screenshotPath = await this.captureAuditScreenshot(page, options.applicationId);
        await preSubmitDelay();

        if (options.pauseBeforeSubmit) {
          return { success: true, status: "pending_review", fieldsFilled: totalFilled, fieldsTotal: totalFields, screenshotPath };
        }

        await submitBtn.click();
        await actionDelay();
        isCompleted = true;
        break;
      }

      const nextBtn = await page.$(
        'button[aria-label*="Continue to next step"], button[aria-label*="Review your application"], button:has-text("Next"), button:has-text("Review")'
      );

      if (nextBtn) {
        await nextBtn.click();
        await randomDelay(1500, 3000);
      } else {
        break;
      }
    }

    // Dismiss any post-submission modal
    try {
      const dismissBtn = await page.$('button[aria-label*="Dismiss"]');
      if (dismissBtn) await dismissBtn.click();
    } catch { /* ignore */ }

    if (isCompleted) {
      return { success: true, status: "submitted", fieldsFilled: totalFilled, fieldsTotal: totalFields, screenshotPath };
    }

    return {
      success: false,
      status: "failed",
      fieldsFilled: totalFilled,
      fieldsTotal: totalFields,
      errorMessage: "Wizard did not reach submit button within step limit.",
    };
  }

  // ── Screenshot Utility ─────────────────────────────────────────────────

  private async captureAuditScreenshot(page: Page, applicationId: string): Promise<string> {
    try {
      const screenshotsDir = join(app.getPath("userData"), "screenshots");
      mkdirSync(screenshotsDir, { recursive: true });
      const filePath = join(screenshotsDir, `audit_${applicationId}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      return filePath;
    } catch {
      return "";
    }
  }
}
