/**
 * Indeed Apply Strategy.
 *
 * Encapsulates modal selectors, cookie banner handling, and multi-step dialogs for Indeed.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";

export class IndeedApplyStrategy implements PlatformApplyStrategy {
  readonly platform = "indeed";

  private readonly modalSelector = "#indeed-apply-widget, div[class*='ia-'], .ia-BasePage, body";

  async openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult> {
    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await actionDelay();

    // 1. Dismiss OneTrust cookie banners if present
    const cookieAccept = await page.$("#onetrust-accept-btn-handler");
    if (cookieAccept) {
      await cookieAccept.click().catch(() => {});
      await randomDelay(300, 800);
    }

    // 2. Check if already applied
    const appliedNotice = await page.$(
      '[data-testid="applied-badge"], span:has-text("You applied"), div:has-text("Applied")'
    );
    if (appliedNotice) {
      return { success: true, alreadyApplied: true };
    }

    // 3. Locate Indeed Apply button
    const applyBtn = await page.$(
      '[data-testid="indeedApplyButton-test"], #indeedApplyButton, .indeed-apply-button, button[aria-label*="Apply now"], button:has-text("Apply now"), button:has-text("Easily apply")'
    );

    if (!applyBtn) {
      return {
        success: false,
        errorMessage: "Indeed Apply button not found on posting.",
      };
    }

    await applyBtn.click();
    await actionDelay();

    return { success: true };
  }

  async isModalOpen(page: Page): Promise<boolean> {
    const modal = await page.$(
      "#indeed-apply-widget, div[class*='ia-'], .ia-BasePage, div[role='dialog']"
    );
    if (!modal) return false;
    return await modal.isVisible();
  }

  getModalContainerSelector(): string {
    return this.modalSelector;
  }

  async findNextButton(page: Page): Promise<any | null> {
    return await page.$(
      'button:has-text("Continue"), button:has-text("Next"), button[data-testid="continue-button"]'
    );
  }

  async findSubmitButton(page: Page): Promise<any | null> {
    return await page.$(
      'button:has-text("Submit your application"), button:has-text("Submit application"), button[data-testid="submit-button"]'
    );
  }

  async dismissPostApplyModal(page: Page): Promise<void> {
    try {
      await randomDelay(1000, 2000);
      const closeBtn = await page.$(
        'button[aria-label="Close"], button:has-text("Return to job search"), button:has-text("Done")'
      );
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
    } catch (err) {
      console.warn("[IndeedStrategy] Error dismissing post-apply modal:", err);
    }
  }
}
