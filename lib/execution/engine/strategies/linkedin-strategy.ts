/**
 * LinkedIn Apply Strategy.
 *
 * Encapsulates modal selectors, Easy Apply detection, and dialog dismissal for LinkedIn.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";

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

    // Locate and click "Easy Apply" button
    const applyBtn = await page.$(
      'button.jobs-apply-button, button[aria-label*="Easy Apply"], button:has-text("Easy Apply")'
    );

    if (!applyBtn) {
      return {
        success: false,
        errorMessage: "Easy Apply button not found on posting.",
      };
    }

    await applyBtn.click();
    await actionDelay();

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

  async findNextButton(page: Page): Promise<any | null> {
    return await page.$(
      'button[aria-label*="Continue to next step"], button[aria-label*="Review your application"], button:has-text("Next"), button:has-text("Review")'
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
        await doneBtn.click();
        await actionDelay();
      } else {
        const closeBtn = await postApplyModal.$('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
        if (closeBtn) {
          await closeBtn.click();
        } else {
          await page.keyboard.press("Escape");
        }
      }
    } catch (err) {
      console.warn("[LinkedInStrategy] Error dismissing post-apply modal:", err);
    }
  }
}
