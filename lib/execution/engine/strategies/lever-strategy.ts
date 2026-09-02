/**
 * Lever ATS Platform Apply Strategy.
 *
 * Implements PlatformApplyStrategy for Lever job postings and application forms.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult } from "../types";
import { actionDelay } from "@/lib/utils/delay";

export class LeverApplyStrategy implements PlatformApplyStrategy {
  readonly platform = "lever";

  getModalContainerSelector(): string {
    return "form#application-form, form";
  }

  async openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult> {
    try {
      let targetUrl = jobUrl;
      if (!targetUrl.endsWith("/apply")) {
        targetUrl = targetUrl.replace(/\/$/, "") + "/apply";
      }

      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await actionDelay();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async isModalOpen(page: Page): Promise<boolean> {
    const form = await page.$("form#application-form, form");
    return !!form;
  }

  async findNextButton(_page: Page): Promise<any | null> {
    // Lever is a single-step ATS form
    return null;
  }

  async findSubmitButton(page: Page): Promise<any | null> {
    return await page.$(
      'button#btn-submit, button[type="submit"], input[type="submit"]:has-text("Submit application"), button:has-text("Submit application")'
    );
  }
}
