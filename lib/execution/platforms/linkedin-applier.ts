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
          await this.dismissPostApplyModal(page);
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
        await this.dismissPostApplyModal(page);
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
    const targetApplied = options.maxJobs ?? 10;
    let totalScanned = 0;
    const maxScanLimit = Math.max(targetApplied * 5, 50); // Safety limit to avoid infinite loops
    let page_num = 1;
    const maxPages = 10;

    while (applied < targetApplied && page_num <= maxPages && totalScanned < maxScanLimit) {
      console.log(`[LinkedInApplier] Scraping job cards on page ${page_num} (Applied: ${applied}/${targetApplied})...`);

      const containerSelector = [
        "li.scaffold-layout__list-item",
        "li.jobs-search-results-list__list-item",
        "div.job-card-container",
        "[data-occludable-job-id]",
        ".jobs-search-results-list",
        ".scaffold-layout__list",
        "ul.scaffold-layout__list-container",
      ].join(", ");

      // Wait for job list / cards to load
      try {
        await page.waitForSelector(containerSelector, { timeout: 15000 });
      } catch {
        console.warn("[LinkedInApplier] Job list / cards not found on this page.");
        break;
      }

      // Scroll the job list panel to trigger lazy loading of all job cards
      await page.evaluate(() => {
        const list = document.querySelector(
          ".jobs-search-results-list, .scaffold-layout__list, .scaffold-layout__list-container, div.jobs-search-two-pane__results"
        );
        if (list) {
          list.scrollTop = 300;
        } else {
          window.scrollBy(0, 300);
        }
      });
      await randomDelay(800, 1500);

      // Get all job cards on this page
      const jobCardSelector = [
        "li.scaffold-layout__list-item",
        "li.jobs-search-results-list__list-item",
        "li.jobs-search__results-list-item",
        "[data-occludable-job-id]",
        "div.job-card-container",
      ].join(", ");

      const rawJobCards = await page.$$(jobCardSelector);

      // Filter out duplicate elements if nested
      const jobCards: typeof rawJobCards = [];
      const seenIds = new Set<string>();

      for (const card of rawJobCards) {
        const jobId = (await card.getAttribute("data-occludable-job-id")) || (await card.getAttribute("data-job-id"));
        if (jobId) {
          if (seenIds.has(jobId)) continue;
          seenIds.add(jobId);
        }
        jobCards.push(card);
      }

      console.log(`[LinkedInApplier] Found ${jobCards.length} job cards on page ${page_num}.`);

      for (const card of jobCards) {
        if (applied >= targetApplied || totalScanned >= maxScanLimit) break;

        let title = "Unknown";
        let company = "Unknown";
        let location = "";
        let linkedInJobId = "";
        let jobUrl = "";

        try {
          // Extract job details from card (get_job_main_details pattern)
          const titleEl = await card.$(
            "a[href*='/jobs/view/'], a.job-card-list__title, a.job-card-container__link, a.job-card-list__title--link, a[data-control-id], a.fb61fb54"
          );
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
          if (!linkedInJobId) {
            linkedInJobId =
              (await card.getAttribute("data-occludable-job-id")) ||
              (await card.getAttribute("data-job-id")) ||
              "";
          }

          const companyEl = await card.$(
            "a[href*='/company/'], .artdeco-entity-lockup__subtitle, .job-card-container__primary-description, .job-card-container__company-name"
          );
          if (companyEl) company = (await companyEl.innerText()).trim();

          const locationEl = await card.$(
            ".artdeco-entity-lockup__caption, .job-card-container__metadata-item, .job-card-container__metadata-wrapper, span._3876217e"
          );
          if (locationEl) location = (await locationEl.innerText()).trim();

          // Skip if already applied
          const appliedBadge = await card.$(".job-card-container__footer-job-state");
          if (appliedBadge) {
            const badgeText = await appliedBadge.innerText();
            if (badgeText.toLowerCase().includes("applied")) {
              console.log(`[LinkedInApplier] Skipping already-applied job: ${title}`);
              results.push({
                jobId: linkedInJobId,
                linkedInJobId,
                title,
                company,
                location,
                status: "skipped",
                success: false,
                errorMessage: "Already applied",
              });
              skipped++;
              totalScanned++;
              continue;
            }
          }

          // Scroll card into view and click to load details panel
          await card.scrollIntoViewIfNeeded().catch(() => {});
          if (titleEl) {
            await titleEl.click();
          } else {
            await card.click();
          }
          await randomDelay(1200, 2500);

          // Fallback: If title or company is generic/unknown, extract from open detail panel on right
          if (title === "Unknown" || company === "Unknown" || !title || !company) {
            try {
              const detailTitle = await page.$eval(
                "h1, h2.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, a[href*='/jobs/view/']",
                (el) => el.textContent?.trim()
              ).catch(() => null);

              const detailCompany = await page.$eval(
                "a[href*='/company/'], .job-details-jobs-unified-top-card__company-name",
                (el) => el.textContent?.trim()
              ).catch(() => null);

              const detailLocation = await page.$eval(
                ".job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, span._3876217e",
                (el) => el.textContent?.trim()
              ).catch(() => null);

              if (detailTitle) title = detailTitle;
              if (detailCompany) company = detailCompany;
              if (detailLocation) location = detailLocation;
            } catch { /* ignore fallback errors */ }
          }

          // Check if Easy Apply button exists in detail panel
          const easyApplyBtn = await page.$(
            'button.jobs-apply-button:has-text("Easy Apply"), button[aria-label*="Easy Apply"], button.jobs-apply-button'
          );
          if (!easyApplyBtn) {
            console.log(`[LinkedInApplier] Skipping (no Easy Apply): ${title} @ ${company}`);
            results.push({
              jobId: linkedInJobId,
              linkedInJobId,
              title,
              company,
              location,
              status: "skipped",
              success: false,
              errorMessage: "No Easy Apply button",
            });
            skipped++;
            totalScanned++;
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

          totalScanned++;
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
          totalScanned++;
        }
      }

      // Try to go to next page if target not yet reached
      if (applied < targetApplied && totalScanned < maxScanLimit) {
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

    // Dismiss post-submission success modal ("Application sent" -> "Done")
    await this.dismissPostApplyModal(page);

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

  /**
   * Helper to dismiss post-application modal popups ("Application sent", "Your application was sent to...")
   */
  private async dismissPostApplyModal(page: Page): Promise<void> {
    try {
      await randomDelay(1200, 2500);

      // Search for post-apply modal container
      const postModal = await page.$(
        'div.artdeco-modal:has-text("Application sent"), div.artdeco-modal:has-text("Your application was sent"), div[data-test-modal], div.artdeco-modal'
      );

      if (postModal) {
        console.log("[LinkedInApplier] Post-apply modal detected. Attempting to click Done / Dismiss...");

        // Try finding and clicking "Done" button or primary action button
        const doneBtn = await postModal.$(
          'button:has-text("Done"), .artdeco-modal__actionbar button, button[data-test-modal-close-btn], button.artdeco-modal__dismiss, button[aria-label="Dismiss"], button:has-text("Dismiss")'
        );

        if (doneBtn) {
          console.log("[LinkedInApplier] Clicking Done button on post-apply modal...");
          await doneBtn.click({ force: true }).catch(async () => {
            await doneBtn.evaluate((el: any) => el.click());
          });
          await randomDelay(1000, 2000);
        }
      }

      // Double check if any modal is still visible and dismiss via close icon or Escape key
      const remainingModal = await page.$("div.artdeco-modal, [data-test-modal]");
      if (remainingModal && (await remainingModal.isVisible().catch(() => false))) {
        console.log("[LinkedInApplier] Modal still present. Clicking close button or pressing Escape key...");
        const closeIcon = await remainingModal.$(
          "button.artdeco-modal__dismiss, [data-test-modal-close-btn], button[aria-label*='Dismiss']"
        );
        if (closeIcon) {
          await closeIcon.click({ force: true }).catch(async () => {
            await closeIcon.evaluate((el: any) => el.click());
          });
        } else {
          await page.keyboard.press("Escape").catch(() => {});
        }
        await randomDelay(800, 1500);
      }
    } catch (err) {
      console.warn("[LinkedInApplier] Warning dismissPostApplyModal:", err);
    }
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
