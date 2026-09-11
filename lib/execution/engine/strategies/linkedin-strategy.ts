/**
 * LinkedIn Apply Strategy.
 *
 * Encapsulates modal selectors, Easy Apply detection, pre-uploaded resume selection,
 * and dialog dismissal for LinkedIn.
 * Enhanced with selectors & heuristics from wodsuz/EasyApplyJobsBot.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";
import { humanClick } from "../../human-cursor";

export class LinkedInApplyStrategy implements PlatformApplyStrategy {
  readonly platform = "linkedin";

  private readonly modalSelector = ".jobs-easy-apply-modal, div.artdeco-modal";

  async openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult> {
    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await actionDelay();

    // Check if already applied
    const appliedIndicator = await page.$(
      '.jobs-s-apply__applied-date, span:has-text("Applied"), span:has-text("Application submitted")'
    );
    if (appliedIndicator) {
      return { success: true, alreadyApplied: true };
    }

    // Locate and click "Easy Apply" button (top-card container + generic button selectors from EasyApplyJobsBot)
    const applyBtn = await page.$(
      'div.jobs-apply-button--top-card button.jobs-apply-button, button.jobs-apply-button, button[aria-label*="Easy Apply"], button:has-text("Easy Apply")'
    );

    if (!applyBtn) {
      return {
        success: false,
        errorMessage: "Easy Apply button not found on posting.",
      };
    }

    await humanClick(page, applyBtn);
    await actionDelay();

    // Fix for LinkedIn Issue #72 (from EasyApplyJobsBot):
    // LinkedIn sometimes displays an extra "Continue to next step" button directly after clicking Easy Apply
    try {
      const continueBtn = await page.$("button[aria-label='Continue to next step']");
      if (continueBtn && (await continueBtn.isVisible())) {
        await humanClick(page, continueBtn);
        await actionDelay();
      }
    } catch {
      // Continue normally if not present
    }

    const isModalPresent = await this.isModalOpen(page);
    return { success: isModalPresent };
  }

  async isModalOpen(page: Page): Promise<boolean> {
    const modal = await page.$(this.modalSelector);
    if (!modal) return false;
    return await modal.isVisible();
  }

  getModalContainerSelector(): string {
    return this.modalSelector;
  }

  /**
   * Hook called before filling fields on a step:
   * 1. Auto-selects pre-uploaded resumes if on resume upload step.
   * 2. Unchecks 'Follow company' checkbox if present.
   */
  async beforeStepFill(page: Page, _stepIndex: number): Promise<void> {
    try {
      // 1. Pre-uploaded resume selection (from EasyApplyJobsBot)
      const resumeSection = await page.$(
        ".jobs-document-upload__title--is-required, .jobs-document-upload, div:has(> .ui-attachment--pdf)"
      );
      if (resumeSection) {
        // Find pre-uploaded resumes with aria-label="Select this resume"
        const resumeSelectBtn = await page.$(
          'button[aria-label*="Select this resume"], div.ui-attachment--pdf, .jobs-document-upload__attachment-card'
        );
        if (resumeSelectBtn && (await resumeSelectBtn.isVisible())) {
          await humanClick(page, resumeSelectBtn);
          await actionDelay();
        }
      }

      // 2. Uncheck 'Follow company' checkbox (from EasyApplyJobsBot)
      const followCheckbox = await page.$(
        "input#follow-company-checkbox, input[name='follow-company-checkbox']"
      );
      if (followCheckbox && (await followCheckbox.isChecked())) {
        const followLabel = await page.$("label[for='follow-company-checkbox']");
        if (followLabel) {
          await humanClick(page, followLabel);
        } else {
          await followCheckbox.uncheck();
        }
      }
    } catch (err) {
      // Non-critical hook
      console.warn("[LinkedInStrategy] beforeStepFill warning:", err);
    }
  }

  async findNextButton(page: Page): Promise<any | null> {
    return await page.$(
      'button[aria-label*="Continue to next step"], button[aria-label*="Review your application"], button:has-text("Next"), button:has-text("Review"), button[data-easy-apply-next-button]'
    );
  }

  async findSubmitButton(page: Page): Promise<any | null> {
    return await page.$(
      'button[aria-label*="Submit application"], button:has-text("Submit application")'
    );
  }

  async dismissPostApplyModal(page: Page): Promise<void> {
    try {
      await randomDelay(1000, 2000);
      const postApplyModal = await page.$("div.artdeco-modal, .jobs-post-apply-modal");
      if (!postApplyModal) return;

      const doneBtn = await postApplyModal.$(
        'button[aria-label*="Dismiss"], button:has-text("Done"), button:has-text("Dismiss"), button:has-text("Got it")'
      );
      if (doneBtn) {
        await humanClick(page, doneBtn);
        await actionDelay();
      } else {
        const closeBtn = await postApplyModal.$('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
        if (closeBtn) {
          await humanClick(page, closeBtn);
        } else {
          await page.keyboard.press("Escape");
        }
      }
    } catch (err) {
      console.warn("[LinkedInStrategy] Error dismissing post-apply modal:", err);
    }
  }
}
