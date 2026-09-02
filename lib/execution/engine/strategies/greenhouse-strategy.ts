/**
 * Greenhouse ATS Platform Apply Strategy.
 *
 * Implements PlatformApplyStrategy for jobs hosted on Greenhouse boards and embeds.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult } from "../types";
import { actionDelay } from "@/lib/utils/delay";

export class GreenhouseApplyStrategy implements PlatformApplyStrategy {
  readonly platform = "greenhouse";

  getModalContainerSelector(): string {
    return "form#application_form, form#application, form";
  }

  async openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult> {
    try {
      await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
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
    const form = await page.$("form#application_form, form#application, form");
    return !!form;
  }

  async findNextButton(_page: Page): Promise<any | null> {
    // Greenhouse is a single-step ATS form
    return null;
  }

  async findSubmitButton(page: Page): Promise<any | null> {
    return await page.$(
      'input[type="submit"]#submit_app, button#submit_app, input[type="submit"][value*="Submit"], button:has-text("Submit Application"), input[value*="Submit Application" i]'
    );
  }
}
