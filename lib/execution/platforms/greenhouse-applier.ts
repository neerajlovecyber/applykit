/**
 * Greenhouse ATS Platform Applier using Playwright.
 *
 * Extracted and adapted from autoapplycv's form-heuristics.js Greenhouse selectors.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay } from "@/lib/utils/delay";

export class GreenhouseApplier implements PlatformApplier {
  readonly platformId = "greenhouse";

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    console.log(`[GreenhouseApplier] Navigating to Greenhouse job form: ${options.jobUrl}`);

    const profile = getProfileById(options.profileId);
    if (!profile) {
      return { success: false, status: "failed", fieldsFilled: 0, fieldsTotal: 0, errorMessage: "Profile not found" };
    }

    const formFiller = new FormFiller(profile);

    try {
      await page.goto(options.jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      // Greenhouse form container `#application_form` or `form#application`
      const summary = await formFiller.fillCurrentStep(page, "form#application_form, form#application, form");

      // Attach resume if present
      const resumeInput = await page.$('input[type="file"][id*="resume" i], input[type="file"][name*="resume" i]');
      if (resumeInput && profile.resume_path) {
        await resumeInput.setInputFiles(profile.resume_path);
        await actionDelay();
      }

      const submitBtn = await page.$(
        'input[type="submit"]#submit_app, button#submit_app, input[type="submit"][value*="Submit"], button:has-text("Submit Application")'
      );

      if (options.pauseBeforeSubmit || !submitBtn) {
        updateApplicationStatus(options.applicationId, "pending_review", "Greenhouse form filled, awaiting user approval");
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
