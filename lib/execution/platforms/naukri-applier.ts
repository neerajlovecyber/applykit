/**
 * Naukri Platform Applier using Playwright.
 *
 * Adapted from Naukri-Automation reference repo & autoapplycv.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails } from "@/lib/main/db-queries";
import { actionDelay, preSubmitDelay, randomDelay } from "@/lib/utils/delay";
import { extractNaukriAuthToken, applyNaukriJobAPI } from "./naukri-api";

export class NaukriApplier implements PlatformApplier {
  readonly platformId = "naukri";

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    console.log(`[NaukriApplier] Starting application for job: ${options.jobUrl}`);

    const profile = getProfileById(options.profileId);
    if (!profile) {
      return {
        success: false,
        status: "failed",
        fieldsFilled: 0,
        fieldsTotal: 0,
        errorMessage: "Profile not found",
      };
    }

    const formFiller = new FormFiller(profile);
    let totalFilled = 0;
    let totalFields = 0;

    try {
      await page.goto(options.jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      // Extract Job ID from URL if present (e.g. -120424001234? or /job-listings-...)
      const jobIdMatch = options.jobUrl.match(/-(\d{8,16})/);
      const jobId = jobIdMatch ? jobIdMatch[1] : undefined;

      // Extract auth token from browser session context
      const authToken = await extractNaukriAuthToken(page);

      // 1. Check for "Already Applied" indicators
      const alreadyApplied = await page.$(
        ".already-applied, .applied-message, .applied-banner, button:has-text('Applied'), span:has-text('Already Applied')"
      );
      if (alreadyApplied) {
        console.log(`[NaukriApplier] Job ${options.jobUrl} is already applied.`);
        updateApplicationStatus(options.applicationId, "submitted", "Already applied on Naukri");
        return { success: true, status: "submitted", fieldsFilled: 0, fieldsTotal: 0 };
      }

      // 2. Locate Apply Button
      const applyBtn = await page.$(
        "#apply-button, button.apply-button, button.waves-effect:has-text('Apply'), button:has-text('Apply on company site'), button:has-text('Apply'), div.apply-button-container button"
      );

      if (!applyBtn) {
        // Fallback: If direct jobId & authToken are available, attempt direct API apply
        if (jobId && authToken) {
          console.log(`[NaukriApplier] UI apply button missing. Attempting direct API apply for Job ${jobId}...`);
          const apiRes = await applyNaukriJobAPI([jobId], undefined, authToken);
          if (apiRes.ok || apiRes.status === 200) {
            updateApplicationStatus(options.applicationId, "submitted", "Applied via Naukri API fallback");
            return { success: true, status: "submitted", fieldsFilled: 0, fieldsTotal: 0 };
          }
        }

        return {
          success: false,
          status: "failed",
          fieldsFilled: 0,
          fieldsTotal: 0,
          errorMessage: "Naukri apply button not found on posting.",
        };
      }

      const buttonText = ((await applyBtn.textContent()) || "").trim().toLowerCase();

      // Handle external redirect apply button
      if (buttonText.includes("company site") || buttonText.includes("apply on company site")) {
        console.log(`[NaukriApplier] Job requires application on company site.`);
        updateApplicationStatus(
          options.applicationId,
          "failed",
          "External company site application required"
        );
        return {
          success: false,
          status: "failed",
          fieldsFilled: 0,
          fieldsTotal: 0,
          errorMessage: "Requires applying on external company site",
        };
      }

      // Click the Apply Button
      await applyBtn.click();
      await actionDelay();

      // 3. Multi-Step Questionnaire & Modal Loop
      const maxSteps = 5;
      let isCompleted = false;

      for (let step = 0; step < maxSteps; step++) {
        // Check for questionnaire container or modal drawer
        const modal = await page.$(
          ".questionnaire-modal, div.drawer, div.apply-message, div.chatbot-container, .apply-drawer, form.apply-form, div.custom-questions"
        );

        if (modal) {
          const stepSummary = await formFiller.fillCurrentStep(
            page,
            ".questionnaire-modal, div.drawer, div.apply-message, div.chatbot-container, .apply-drawer, form.apply-form"
          );
          totalFilled += stepSummary.fieldsFilled;
          totalFields += stepSummary.fieldsTotal;

          const submitBtn = await page.$(
            'button:has-text("Submit"), button:has-text("Save & Apply"), button:has-text("Submit application"), button[type="submit"]'
          );

          if (submitBtn) {
            if (options.pauseBeforeSubmit) {
              updateApplicationStatus(
                options.applicationId,
                "pending_review",
                "Naukri questionnaire filled, awaiting user approval"
              );
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
            await randomDelay(1200, 2000);
          } else {
            // If no submit or next button, assume single step finished
            isCompleted = true;
            break;
          }
        } else {
          // Quick single-click application without modal
          isCompleted = true;
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
        errorMessage: "Naukri application loop did not reach completion within step limit.",
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        status: "failed",
        fieldsFilled: totalFilled,
        fieldsTotal: totalFields,
        errorMessage: errorMsg,
      };
    }
  }

  async login(page: Page, username?: string, password?: string): Promise<{ success: boolean; authToken?: string; errorMessage?: string }> {
    if (!username || !password) {
      return { success: false, errorMessage: "Username and password are required" };
    }

    try {
      console.log(`[NaukriApplier] Navigating to Naukri login page with Playwright...`);
      await page.goto("https://www.naukri.com/nlogin/login", { waitUntil: "domcontentloaded", timeout: 30000 });
      await randomDelay(1000, 2000);

      const userField = await page.$(
        "#usernameField, input[placeholder*='Email'], input[placeholder*='Username'], input[type='text']"
      );
      if (userField) {
        await userField.fill(username);
        await randomDelay(300, 700);
      }

      const passField = await page.$(
        "#passwordField, input[placeholder*='Password'], input[type='password']"
      );
      if (passField) {
        await passField.fill(password);
        await randomDelay(300, 700);
      }

      const submitBtn = await page.$(
        "button[type='submit'], button.btn-primary, button:has-text('Login')"
      );
      if (submitBtn) {
        await submitBtn.click();
        await randomDelay(3000, 5000);
      }

      const cookies = await page.context().cookies("https://www.naukri.com");
      const naukAtCookie = cookies.find((c) => c.name === "nauk_at");

      if (naukAtCookie?.value) {
        console.log("[NaukriApplier] Playwright login successful! Token acquired.");
        return { success: true, authToken: naukAtCookie.value };
      }

      const currentUrl = page.url();
      if (!currentUrl.includes("/nlogin/login")) {
        return { success: true, authToken: `nauk_session_${Date.now()}` };
      }

      return { success: false, errorMessage: "Login failed or captcha encountered." };
    } catch (err) {
      console.error("[NaukriApplier] Playwright login error:", err);
      return { success: false, errorMessage: err instanceof Error ? err.message : String(err) };
    }
  }
}
