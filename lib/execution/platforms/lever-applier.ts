/**
 * Lever ATS Platform Applier using Playwright.
 *
 * Extracted and adapted from autoapplycv's form-heuristics.js Lever selectors.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay } from "@/lib/utils/delay";

export class LeverApplier implements PlatformApplier {
  readonly platformId = "lever";

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    console.log(`[LeverApplier] Navigating to Lever job form: ${options.jobUrl}`);

    const profile = getProfileById(options.profileId);
    if (!profile) {
      return { success: false, status: "failed", fieldsFilled: 0, fieldsTotal: 0, errorMessage: "Profile not found" };
    }

    const formFiller = new FormFiller(profile);

    try {
      // Lever forms usually have an /apply route if on detail page
      let targetUrl = options.jobUrl;
      if (!targetUrl.endsWith("/apply")) {
        targetUrl = targetUrl.replace(/\/$/, "") + "/apply";
      }

      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      // Lever specific form fields (Full Name, Email, Phone, Current Company, LinkedIn URL, Portfolio)
      const summary = await formFiller.fillCurrentStep(page, "form#application-form, form");

      // Attach resume if input file present
      const resumeInput = await page.$('input[type="file"][name="resume"]');
      if (resumeInput && profile.resume_path) {
        await resumeInput.setInputFiles(profile.resume_path);
        await actionDelay();
      }

      const submitBtn = await page.$(
        'button#btn-submit, button[type="submit"], input[type="submit"]:has-text("Submit application")'
      );

      if (options.pauseBeforeSubmit || !submitBtn) {
        updateApplicationStatus(options.applicationId, "pending_review", "Lever form filled, awaiting user approval");
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
