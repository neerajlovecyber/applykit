/**
 * FormAutomationEngine — Unified Multi-Step Job Application Wizard Controller.
 *
 * Implements the core multi-step automation workflow across all platforms:
 * - Session checkout & modal opening
 * - Form field detection & filling via FormFiller heuristics
 * - Human-in-the-loop pause logic before submission
 * - Automatic audit screenshot capture
 * - Persistence to applications & history tables with status tracking
 */

import type { Page } from "playwright";
import path from "path";
import os from "os";
import fs from "fs";
import type { ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import type { PlatformApplyStrategy, FormEngineOptions } from "./types";
import { FormFiller } from "../form-filler";
import {
  getProfileById,
  updateApplicationStatus,
  updateApplicationFillDetails,
} from "@/lib/db";
import { actionDelay, preSubmitDelay, randomDelay } from "@/lib/utils/delay";
import {
  LinkedInApplyStrategy,
  NaukriApplyStrategy,
  IndeedApplyStrategy,
  GreenhouseApplyStrategy,
  LeverApplyStrategy,
  ReedApplyStrategy,
  GlassdoorApplyStrategy,
  GenericApplyStrategy,
} from "./strategies";

export class FormAutomationEngine {
  private readonly defaultMaxSteps = 10;
  private readonly defaultScreenshotDir = path.join(os.homedir(), ".applykit", "screenshots");
  private readonly strategies = new Map<string, PlatformApplyStrategy>();

  constructor(private readonly options: FormEngineOptions = {}) {
    this.registerStrategy(new LinkedInApplyStrategy());
    this.registerStrategy(new NaukriApplyStrategy());
    this.registerStrategy(new IndeedApplyStrategy());
    this.registerStrategy(new GreenhouseApplyStrategy());
    this.registerStrategy(new LeverApplyStrategy());
    this.registerStrategy(new ReedApplyStrategy());
    this.registerStrategy(new GlassdoorApplyStrategy());
    this.registerStrategy(new GenericApplyStrategy());
  }

  /**
   * Register a platform apply strategy.
   */
  registerStrategy(strategy: PlatformApplyStrategy): void {
    this.strategies.set(strategy.platform.toLowerCase(), strategy);
  }

  /**
   * Retrieve the strategy for a given platform, falling back to GenericApplyStrategy.
   */
  getStrategy(platform: string): PlatformApplyStrategy {
    const key = (platform || "").toLowerCase();
    return this.strategies.get(key) ?? this.strategies.get("generic") ?? new GenericApplyStrategy();
  }

  /**
   * Execute an application on the given page using the provided platform strategy or platform name.
   */
  async execute(
    page: Page,
    strategyOrPlatform: PlatformApplyStrategy | string,
    executeOptions: ApplicationExecuteOptions
  ): Promise<ApplicationExecuteResult> {
    const strategy =
      typeof strategyOrPlatform === "string"
        ? this.getStrategy(strategyOrPlatform)
        : strategyOrPlatform;
    const { applicationId, jobUrl, profileId, pauseBeforeSubmit = true } = executeOptions;
    const maxSteps = this.options.maxSteps ?? this.defaultMaxSteps;

    console.log(`[FormEngine] [${strategy.platform}] Starting application for job: ${jobUrl}`);

    const profile = getProfileById(profileId);
    if (!profile) {
      const errMsg = `Profile not found for ID: ${profileId}`;
      updateApplicationStatus(applicationId, "failed", errMsg);
      return {
        success: false,
        status: "failed",
        fieldsFilled: 0,
        fieldsTotal: 0,
        errorMessage: errMsg,
      };
    }

    const formFiller = new FormFiller(profile);
    let totalFilled = 0;
    let totalFields = 0;
    let screenshotPath: string | undefined;

    try {
      // 1. Open the application modal / trigger apply flow
      const openResult = await strategy.openApplyModal(page, jobUrl);

      if (openResult.alreadyApplied) {
        console.log(`[FormEngine] [${strategy.platform}] Job already applied: ${jobUrl}`);
        updateApplicationStatus(applicationId, "submitted", "Already applied previously on platform");
        return {
          success: true,
          status: "submitted",
          fieldsFilled: 0,
          fieldsTotal: 0,
        };
      }

      if (openResult.requiresExternalApply) {
        console.log(`[FormEngine] [${strategy.platform}] External application required for: ${jobUrl}`);
        const errMsg = "External company site application required";
        updateApplicationStatus(applicationId, "failed", errMsg);
        return {
          success: false,
          status: "failed",
          fieldsFilled: 0,
          fieldsTotal: 0,
          errorMessage: errMsg,
        };
      }

      if (!openResult.success) {
        const errMsg = openResult.errorMessage || `Failed to open apply modal on ${strategy.platform}`;
        console.warn(`[FormEngine] [${strategy.platform}] ${errMsg}`);
        updateApplicationStatus(applicationId, "failed", errMsg);
        return {
          success: false,
          status: "failed",
          fieldsFilled: 0,
          fieldsTotal: 0,
          errorMessage: errMsg,
        };
      }

      // 2. Multi-Step Wizard Loop
      const containerSelector = strategy.getModalContainerSelector();
      let step = 0;

      for (; step < maxSteps; step++) {
        const isOpen = await strategy.isModalOpen(page);
        if (!isOpen) {
          console.log(`[FormEngine] [${strategy.platform}] Application modal closed or completed.`);
          break;
        }

        // Platform-specific hook before filling fields
        if (strategy.beforeStepFill) {
          await strategy.beforeStepFill(page, step);
        }

        // Fill form fields on current step (custom platform strategy or generic form filler)
        let stepSummary = { fieldsFilled: 0, fieldsTotal: 0 };
        if (strategy.fillStep) {
          const customResult = await strategy.fillStep(page, profile, step);
          if (customResult.handled) {
            stepSummary = {
              fieldsFilled: customResult.fieldsFilled,
              fieldsTotal: customResult.fieldsFilled || 1,
            };
            totalFilled += stepSummary.fieldsFilled;
            totalFields += stepSummary.fieldsTotal;

            if (customResult.completed) {
              console.log(`[FormEngine] [${strategy.platform}] Custom step filler marked application complete.`);
              screenshotPath = await this.captureScreenshot(page, applicationId);
              updateApplicationStatus(applicationId, "submitted");
              updateApplicationFillDetails(applicationId, {
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
          } else {
            stepSummary = await formFiller.fillCurrentStep(page, containerSelector);
            totalFilled += stepSummary.fieldsFilled;
            totalFields += stepSummary.fieldsTotal;
          }
        } else {
          stepSummary = await formFiller.fillCurrentStep(page, containerSelector);
          totalFilled += stepSummary.fieldsFilled;
          totalFields += stepSummary.fieldsTotal;
        }

        // Platform-specific hook after filling fields
        if (strategy.afterStepFill) {
          await strategy.afterStepFill(page, step);
        }

        // 3. Check for Submit Button
        const submitBtn = await strategy.findSubmitButton(page);

        const skipDelays = this.options.skipDelays ?? (process.env.NODE_ENV === "test");

        if (submitBtn) {
          screenshotPath = await this.captureScreenshot(page, applicationId);
          if (!skipDelays) await preSubmitDelay();

          if (pauseBeforeSubmit) {
            console.log(`[FormEngine] [${strategy.platform}] Ready for human review (paused before submit).`);
            updateApplicationStatus(
              applicationId,
              "pending_review",
              "Awaiting human review before submission"
            );
            updateApplicationFillDetails(applicationId, {
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

          // Human-in-the-loop disabled: submit application automatically
          console.log(`[FormEngine] [${strategy.platform}] Clicking submit button...`);
          await submitBtn.click();
          if (!skipDelays) await actionDelay();

          if (strategy.dismissPostApplyModal) {
            await strategy.dismissPostApplyModal(page);
          }

          updateApplicationStatus(applicationId, "submitted", "Application submitted successfully");
          updateApplicationFillDetails(applicationId, {
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

        // 4. Check for Next / Continue Button
        const nextBtn = await strategy.findNextButton(page);
        if (nextBtn) {
          await nextBtn.click();
          if (!skipDelays) await randomDelay(1200, 2500);
        } else {
          console.log(`[FormEngine] [${strategy.platform}] No next or submit button found on step ${step + 1}.`);
          break;
        }
      }

      // If loop exited without submit or pending_review
      screenshotPath = await this.captureScreenshot(page, applicationId);
      updateApplicationFillDetails(applicationId, {
        fields_filled: totalFilled,
        fields_total: totalFields,
        screenshot_path: screenshotPath,
      });

      return {
        success: totalFilled > 0,
        status: totalFilled > 0 ? "pending_review" : "failed",
        fieldsFilled: totalFilled,
        fieldsTotal: totalFields,
        screenshotPath,
        errorMessage: totalFilled === 0 ? "Form could not be advanced to submission" : undefined,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[FormEngine] [${strategy.platform}] Unhandled execution error: ${errorMsg}`);

      try {
        screenshotPath = await this.captureScreenshot(page, `${applicationId}-error`);
      } catch {
        // Ignore screenshot error
      }

      updateApplicationStatus(applicationId, "failed", errorMsg);
      updateApplicationFillDetails(applicationId, {
        fields_filled: totalFilled,
        fields_total: totalFields,
        screenshot_path: screenshotPath,
      });

      return {
        success: false,
        status: "failed",
        fieldsFilled: totalFilled,
        fieldsTotal: totalFields,
        screenshotPath,
        errorMessage: errorMsg,
      };
    }
  }

  /**
   * Capture an audit screenshot and save to disk.
   */
  private async captureScreenshot(page: Page, namePrefix: string): Promise<string | undefined> {
    try {
      const targetDir = this.options.screenshotDir ?? this.defaultScreenshotDir;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, `${namePrefix}-${Date.now()}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      return filePath;
    } catch (err) {
      console.warn(`[FormEngine] Failed to capture screenshot:`, err);
      return undefined;
    }
  }
}
