/**
 * Glassdoor Platform Applier using Playwright.
 *
 * Extracted and adapted from autoapplycv's glassdoor-auto-apply.js reference.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay } from "@/lib/utils/delay";

export class GlassdoorApplier implements PlatformApplier {
  readonly platformId = "glassdoor";

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    console.log(`[GlassdoorApplier] Navigating to Glassdoor job form: ${options.jobUrl}`);

    const profile = getProfileById(options.profileId);
    if (!profile) {
      return { success: false, status: "failed", fieldsFilled: 0, fieldsTotal: 0, errorMessage: "Profile not found" };
    }

    const formFiller = new FormFiller(profile);

    try {
      await page.goto(options.jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      const applyBtn = await page.$(
        'button[data-easy-apply="true"], button.easyApplyBtn, button:has-text("Easy Apply"), button:has-text("Apply Now")'
      );

      if (applyBtn) {
        await applyBtn.click();
        await actionDelay();
      }

      const summary = await formFiller.fillCurrentStep(page, "div.modal, main, form");

      const submitBtn = await page.$(
        'button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit")'
      );

      if (options.pauseBeforeSubmit || !submitBtn) {
        updateApplicationStatus(options.applicationId, "pending_review", "Glassdoor form filled, awaiting user approval");
        updateApplicationFillDetails(options.applicationId, {
          fields_filled: summary.fieldsFilled,
          fields_total: summary.fieldsTotal,
        });

        return {
          success: true,
          status: "pending_review",
          fieldsFilled: summary.fieldsFilled,
          fieldsTotal: summary.fieldsTotal,
        };
      }

      await preSubmitDelay();
      await submitBtn.click();
      await actionDelay();

      updateApplicationStatus(options.applicationId, "submitted");
      updateApplicationFillDetails(options.applicationId, {
        fields_filled: summary.fieldsFilled,
        fields_total: summary.fieldsTotal,
      });

      return {
        success: true,
        status: "submitted",
        fieldsFilled: summary.fieldsFilled,
        fieldsTotal: summary.fieldsTotal,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      updateApplicationStatus(options.applicationId, "failed", errorMsg);
      return {
        success: false,
        status: "failed",
        fieldsFilled: 0,
        fieldsTotal: 0,
        errorMessage: errorMsg,
      };
    }
  }
}
