/**
 * Naukri Apply Strategy.
 *
 * Encapsulates modal selectors, external apply detection, and chatbot/drawer questionnaires for Naukri.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";

export class NaukriApplyStrategy implements PlatformApplyStrategy {
  readonly platform = "naukri";

  private readonly modalSelector =
    "div.chatbot_Drawer, div.layer-wrap, div[class*='apply-drawer'], div[class*='apply-modal'], div.apply-message, body";

  async openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult> {
    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await actionDelay();

    // 1. Check if already applied
    const alreadyAppliedEl = await page.$(
      "div.already-applied, .apply-message:has-text('already applied'), span:has-text('Already Applied'), div.apply-button-container:has-text('Applied')"
    );
    if (alreadyAppliedEl) {
      return { success: true, alreadyApplied: true };
    }

    // 2. Locate Apply button
    const applyBtn = await page.$(
      "#apply-button, button.apply-button, button.waves-effect:has-text('Apply'), button:has-text('Apply on company site'), button:has-text('Apply'), div.apply-button-container button"
    );

    if (!applyBtn) {
      return {
        success: false,
        errorMessage: "Naukri apply button not found on posting.",
      };
    }

    const buttonText = ((await applyBtn.textContent()) || "").trim().toLowerCase();

    // Check if external company site redirect is required
    if (buttonText.includes("company site") || buttonText.includes("apply on company site")) {
      return { success: false, requiresExternalApply: true };
    }

    await applyBtn.click();
    await actionDelay();

    return { success: true };
  }

  async isModalOpen(page: Page): Promise<boolean> {
    // Check if application completed directly (e.g. 1-click apply or success banner)
    const successBanner = await page.$(
      ".chatbot_MessageContainer:has-text('successfully applied'), .chatbot_MessageContainer:has-text('Thank you'), .botMsg:has-text('Applied'), div:has-text('successfully applied'), .apply-message:has-text('applied')"
    );
    if (successBanner && (await successBanner.isVisible().catch(() => false))) {
      return false;
    }

    const drawer = await page.$(
      "div.chatbot_Drawer, div.layer-wrap, div[class*='apply-drawer'], div[class*='apply-modal'], .chatbot_MessageContainer, .questionnaire-modal"
    );
    if (!drawer) {
      // Check if page still has active questions or inputs
      const activeInput = await page.$("div.apply-message input, div.chatbot_Drawer input, .custom-questions input");
      return !!activeInput;
    }
    return await drawer.isVisible();
  }

  getModalContainerSelector(): string {
    return this.modalSelector;
  }

  async findNextButton(page: Page): Promise<any | null> {
    return await page.$(
      'button:has-text("Save and Next"), button:has-text("Next"), button:has-text("Continue"), button.next-btn, a:has-text("Next")'
    );
  }

  async findSubmitButton(page: Page): Promise<any | null> {
    return await page.$(
      'button:has-text("Submit"), button:has-text("Save & Apply"), button:has-text("Submit application"), button[type="submit"], button:has-text("Submit and Apply"), button.submit-btn, button:has-text("Apply Now")'
    );
  }

  async dismissPostApplyModal(page: Page): Promise<void> {
    try {
      await randomDelay(1000, 2000);
      const closeBtn = await page.$(
        "div.chatbot_Drawer .crossIcon, div.chatbot_Drawer .close, div.layer-wrap span.close, div.apply-message .close"
      );
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
    } catch (err) {
      console.warn("[NaukriStrategy] Error dismissing post-apply drawer:", err);
    }
  }
}
