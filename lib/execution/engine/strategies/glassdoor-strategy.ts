/**
 * Glassdoor Platform Apply Strategy.
 *
 * Implements PlatformApplyStrategy for Glassdoor Easy Apply flows and job modals.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult } from "../types";
import { actionDelay } from "@/lib/utils/delay";

export class GlassdoorApplyStrategy implements PlatformApplyStrategy {
  readonly platform = "glassdoor";

  getModalContainerSelector(): string {
    return "div.modal, main, form";
  }

  async openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult> {
    try {
      await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      const applyBtn = await page.$(
        'button[data-easy-apply="true"], button.easyApplyBtn, button:has-text("Easy Apply"), button:has-text("Apply Now")'
      );

      if (applyBtn) {
        await applyBtn.click();
        await actionDelay();
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async isModalOpen(page: Page): Promise<boolean> {
    const modal = await page.$("div.modal, main, form");
    return !!modal;
  }

  async findNextButton(page: Page): Promise<any | null> {
    return await page.$('button:has-text("Next"), button:has-text("Continue")');
  }

  async findSubmitButton(page: Page): Promise<any | null> {
    return await page.$(
      'button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit")'
    );
  }
}
