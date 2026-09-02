/**
 * Generic ATS Apply Strategy.
 *
 * Handles Lever, Greenhouse, Workday, and custom ATS forms.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult } from "../types";
import { actionDelay } from "@/lib/utils/delay";

export class GenericApplyStrategy implements PlatformApplyStrategy {
  constructor(readonly platform: string = "generic") {}

  getModalContainerSelector(): string {
    return "main, form, div.application-form, body";
  }

  async openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult> {
    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await actionDelay();

    // Check if there is an anchor or button that opens / scrolls to the application form
    const applyAnchor = await page.$(
      'a[href*="#apply"], a:has-text("Apply for this job"), button:has-text("Apply Now"), a:has-text("Apply Now"), button.postings-btn'
    );
    if (applyAnchor) {
      await applyAnchor.click().catch(() => {});
      await actionDelay();
    }

    return { success: true };
  }

  async isModalOpen(page: Page): Promise<boolean> {
    // For full-page ATS forms, check if any input or submit element is visible on page
    const formElement = await page.$("form, input, select, textarea");
    return !!formElement;
  }

  async findNextButton(page: Page): Promise<any | null> {
    return await page.$(
      'button:has-text("Next"), button:has-text("Continue"), button.next-step, button[data-testid="next-button"]'
    );
  }

  async findSubmitButton(page: Page): Promise<any | null> {
    return await page.$(
      'button[type="submit"], input[type="submit"], button:has-text("Submit application"), button:has-text("Submit Application"), button:has-text("Submit"), button:has-text("Apply")'
    );
  }
}
