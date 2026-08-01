/**
 * Naukri Platform Applier using Playwright.
 *
 * Extracted and adapted from Naukri-autoapply-bot & autoapplycv references.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay, randomDelay } from "@/lib/utils/delay";

export class NaukriApplier implements PlatformApplier {
  readonly platformId = "naukri";

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    console.log(`[NaukriApplier] Starting application for job: ${options.jobUrl}`);

    const profile = getProfileById(options.profileId);
    if (!profile) {
      return { success: false, status: "failed", fieldsFilled: 0, fieldsTotal: 0, errorMessage: "Profile not found" };
    }

    const formFiller = new FormFiller(profile);

    try {
      await page.goto(options.jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      // Check for "Already Applied" badge
      const alreadyApplied = await page.$(".already-applied, .applied-message, button:has-text('Applied')");
      if (alreadyApplied) {
        updateApplicationStatus(options.applicationId, "submitted", "Already applied on Naukri");
        return { success: true, status: "submitted", fieldsFilled: 0, fieldsTotal: 0 };
      }

      // Click "Apply" button
      const applyBtn = await page.$(
        "#apply-button, button.apply-button, button.waves-effect:has-text('Apply'), button:has-text('Apply on company site')"
      );

      if (!applyBtn) {
        return {
          success: false,
          status: "failed",
          fieldsFilled: 0,
          fieldsTotal: 0,
          errorMessage: "Naukri apply button not found.",
        };
      }

      await applyBtn.click();
      await actionDelay();

      // Check if a questionnaire modal pops up
      const modal = await page.$(".questionnaire-modal, div.drawer, div.apply-message");
      let summary = { fieldsFilled: 0, fieldsTotal: 0 };

      if (modal) {
        const stepSummary = await formFiller.fillCurrentStep(page, ".questionnaire-modal, div.drawer");
        summary.fieldsFilled = stepSummary.fieldsFilled;
        summary.fieldsTotal = stepSummary.fieldsTotal;

        const submitQuestionnaire = await page.$('button:has-text("Submit"), button:has-text("Save & Apply")');
        if (submitQuestionnaire) {
          await preSubmitDelay();
          await submitQuestionnaire.click();
          await actionDelay();
        }
      }

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
