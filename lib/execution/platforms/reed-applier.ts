/**
 * Reed UK Job Portal Applier using Playwright.
 *
 * Extracted and adapted from autoapplycv's reed-auto-apply.js reference.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay } from "@/lib/utils/delay";

export class ReedApplier implements PlatformApplier {
  readonly platformId = "reed";

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    console.log(`[ReedApplier] Navigating to Reed job form: ${options.jobUrl}`);

    const profile = getProfileById(options.profileId);
    if (!profile) {
      return { success: false, status: "failed", fieldsFilled: 0, fieldsTotal: 0, errorMessage: "Profile not found" };
    }

    const formFiller = new FormFiller(profile);

    try {
      await page.goto(options.jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      // Reed Apply button selectors
      const applyBtn = await page.$(
        "#applyButton, a.btn-apply, button.btn-apply, a:has-text('Apply now'), button:has-text('Apply now')"
      );

      if (applyBtn) {
        await applyBtn.click();
        await actionDelay();
      }

      const summary = await formFiller.fillCurrentStep(page, "main, form, .apply-container");

      const submitBtn = await page.$(
        'button[type="submit"]#submit, input[type="submit"].btn-primary, button:has-text("Submit application")'
      );

      if (options.pauseBeforeSubmit || !submitBtn) {
        updateApplicationStatus(options.applicationId, "pending_review", "Reed form filled, awaiting user approval");
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
