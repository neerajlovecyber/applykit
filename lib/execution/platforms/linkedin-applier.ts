/**
 * LinkedIn Easy Apply Platform Applier using Playwright.
 *
 * Adapted from autoapplycv's linkedin-auto-apply.js and
 * Auto_job_applier_linkedIn's clickers_and_finders.py.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay, randomDelay } from "@/lib/utils/delay";
import { join } from "path";
import { app } from "electron";
import { mkdirSync } from "fs";

export class LinkedInApplier implements PlatformApplier {
  readonly platformId = "linkedin";

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

      // 3. Easy Apply Wizard Multi-Step Loop
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
          // Pre-submit audit screenshot (AutoApply & autoapplycv pattern)
          screenshotPath = await this.captureAuditScreenshot(page, options.applicationId);
          await preSubmitDelay();

          if (options.pauseBeforeSubmit) {
            // Human-in-the-loop pause gate
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

          // Click Submit
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
          // Unrecognized step
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
