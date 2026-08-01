/**
 * Indeed Platform Applier using Playwright.
 *
 * Extracted and adapted from autoapplycv's indeed-auto-apply.js reference.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay, randomDelay } from "@/lib/utils/delay";

export class IndeedApplier implements PlatformApplier {
  readonly platformId = "indeed";

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    console.log(`[IndeedApplier] Starting application for job: ${options.jobUrl}`);

    const profile = getProfileById(options.profileId);
    if (!profile) {
      return { success: false, status: "failed", fieldsFilled: 0, fieldsTotal: 0, errorMessage: "Profile not found" };
    }

    const formFiller = new FormFiller(profile);
    let totalFilled = 0;
    let totalFields = 0;

    try {
      await page.goto(options.jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      // Dismiss OneTrust cookie banners if present
      const cookieAccept = await page.$("#onetrust-accept-btn-handler");
      if (cookieAccept) {
        await cookieAccept.click();
        await randomDelay(300, 800);
      }

      // Locate "Apply Now" / "Indeed Apply" button
      const applyBtn = await page.$(
        '[data-testid="indeedApplyButton-test"], #indeedApplyButton, .indeed-apply-button, button[aria-label*="Apply now"], button:has-text("Apply now"), button:has-text("Easily apply")'
      );

      if (!applyBtn) {
        return {
          success: false,
          status: "failed",
          fieldsFilled: 0,
          fieldsTotal: 0,
          errorMessage: "Indeed Apply button not found on posting.",
        };
      }

      await applyBtn.click();
      await actionDelay();

      // Multi-step Indeed Form Loop
      const maxSteps = 8;
      let isCompleted = false;

      for (let step = 0; step < maxSteps; step++) {
        const summary = await formFiller.fillCurrentStep(page, "main, form, div.ia-BasePage");
        totalFilled += summary.fieldsFilled;
        totalFields += summary.fieldsTotal;

        const submitBtn = await page.$(
          'button[type="submit"], button:has-text("Submit your application"), button:has-text("Submit application")'
        );

        if (submitBtn) {
          if (options.pauseBeforeSubmit) {
            updateApplicationStatus(options.applicationId, "pending_review", "Indeed application filled, awaiting user approval");
            updateApplicationFillDetails(options.applicationId, {
              fields_filled: totalFilled,
              fields_total: totalFields,
            });

            return {
              success: true,
              status: "pending_review",
              fieldsFilled: totalFilled,
              fieldsTotal: totalFields,
            };
          }

          await preSubmitDelay();
          await submitBtn.click();
          await actionDelay();
          isCompleted = true;
          break;
        }

        const nextBtn = await page.$(
          'button:has-text("Continue"), button:has-text("Next"), button[aria-label*="Continue"]'
        );

        if (nextBtn) {
          await nextBtn.click();
          await randomDelay(1500, 2500);
        } else {
          break;
        }
      }

      if (isCompleted) {
        updateApplicationStatus(options.applicationId, "submitted");
        updateApplicationFillDetails(options.applicationId, {
          fields_filled: totalFilled,
          fields_total: totalFields,
        });

        return {
          success: true,
          status: "submitted",
          fieldsFilled: totalFilled,
          fieldsTotal: totalFields,
        };
      }

      return {
        success: false,
        status: "failed",
        fieldsFilled: totalFilled,
        fieldsTotal: totalFields,
        errorMessage: "Indeed wizard did not reach final submit within step limit.",
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
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
}
