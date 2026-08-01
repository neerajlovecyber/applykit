/**
 * Generic Form Applier for Lever, Greenhouse, Workday, and custom ATS forms.
 *
 * Adapted from autoapplycv's form-heuristics.js and indeed-auto-apply.js.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay } from "@/lib/utils/delay";

export class GenericApplier implements PlatformApplier {
  readonly platformId = "generic";

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    console.log(`[GenericApplier] Navigating to target job URL: ${options.jobUrl}`);

    const profile = getProfileById(options.profileId);
    if (!profile) {
      return { success: false, status: "failed", fieldsFilled: 0, fieldsTotal: 0, errorMessage: "Profile not found" };
    }

    const formFiller = new FormFiller(profile);

    try {
      await page.goto(options.jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      // Scan and fill page form elements
      const summary = await formFiller.fillCurrentStep(page, "body");

      // Locate submit button
      const submitBtn = await page.$(
        'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply")'
      );

      if (options.pauseBeforeSubmit || !submitBtn) {
        updateApplicationStatus(options.applicationId, "pending_review", "Form filled, awaiting human submit");
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
