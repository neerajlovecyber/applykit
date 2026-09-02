/**
 * Reed UK Platform Apply Strategy.
 *
 * Implements PlatformApplyStrategy for Reed job listings and application forms.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult } from "../types";
import { actionDelay } from "@/lib/utils/delay";

export class ReedApplyStrategy implements PlatformApplyStrategy {
  readonly platform = "reed";

  getModalContainerSelector(): string {
    return "main, form, .apply-container";
  }

  async openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult> {
    try {
      await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();

      const applyBtn = await page.$(
        "#applyButton, a.btn-apply, button.btn-apply, a:has-text('Apply now'), button:has-text('Apply now')"
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
    const container = await page.$("main, form, .apply-container");
    return !!container;
  }

  async findNextButton(_page: Page): Promise<any | null> {
    return null;
  }

  async findSubmitButton(page: Page): Promise<any | null> {
    return await page.$(
      'button[type="submit"]#submit, input[type="submit"].btn-primary, button:has-text("Submit application"), button[type="submit"]'
    );
  }
}
