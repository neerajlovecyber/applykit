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

  private readonly modalSelector = ".jobs-easy-apply-modal, div.artdeco-modal, div[role='dialog'], div[data-test-modal]";

  async openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult> {
    // Ensure English language cookie is set on LinkedIn domain to prevent Arabic auto-switch
    try {
      if (page.context?.()?.addCookies) {
        await page.context().addCookies([
          { name: "lang", value: "v=2&lang=en-us", domain: ".linkedin.com", path: "/" },
          { name: "lang", value: "v=2&lang=en-us", domain: "www.linkedin.com", path: "/" },
        ]);
      }
    } catch {}

    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await actionDelay();

    // If page loaded in Arabic, enforce English cookie and reload
    try {
      if (typeof page.$eval === "function") {
        const htmlLang = await page.$eval("html", (el) => el.getAttribute("lang") || "").catch(() => "");
        if (htmlLang && htmlLang.startsWith("ar")) {
          console.log(`[LinkedInStrategy] Detected Arabic locale (${htmlLang}), switching to English...`);
          await page.evaluate(() => {
            document.cookie = "lang=v=2&lang=en-us; domain=.linkedin.com; path=/";
          }).catch(() => {});
          await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
          await actionDelay();
        }
      }
    } catch {}

    // Check if already applied
    const appliedIndicator = await page.$(
      '.jobs-s-apply__applied-date, span:has-text("Applied"), span:has-text("Application submitted"), span:has-text("تم التقديم")'
    );
    if (appliedIndicator) {
      return { success: true, alreadyApplied: true };
    }

    // Locate and click "Easy Apply" element (button or anchor for modern SDUI flow)
    // Supports classic buttons, SDUI anchor links (<a aria-label="Easy Apply to this job" href="...openSDUIApplyFlow=true">)
    const applyBtn = await page.$(
      'a[aria-label*="Easy Apply"], button[aria-label*="Easy Apply"], ' +
      'a[href*="openSDUIApplyFlow=true"], a[href*="/apply/"], ' +
      'div.jobs-apply-button--top-card button.jobs-apply-button, button.jobs-apply-button, ' +
      'a:has-text("Easy Apply"), button:has-text("Easy Apply"), ' +
      'button:has-text("التقديم السريع"), a:has-text("التقديم السريع"), ' +
      '[aria-label*="Easy Apply to this job"], [componentkey][aria-label*="Easy Apply"]'
    );

    if (!applyBtn) {
      // Check if this job requires external application (e.g. "Apply on company website" redirect link)
      const externalApplyBtn = await page.$(
        'a[aria-label*="Apply on company website"], a[href*="/safety/go"], svg#link-external-medium, a:has(svg#link-external-medium), button[aria-label*="Apply on company website"]'
      );
      if (externalApplyBtn) {
        console.log(`[LinkedInStrategy] Detected external company website application for: ${jobUrl}`);
        return {
          success: false,
          requiresExternalApply: true,
          errorMessage: "Job requires applying on external company website (non-Easy Apply job)",
        };
      }

      // Secondary check for external apply buttons
      const anyApply = await page.$(
        'a:has-text("Apply"), button:has-text("Apply")'
      );
      if (anyApply) {
        const text = (await anyApply.textContent() || "").trim();
        const ariaLabel = (await anyApply.getAttribute("aria-label") || "").trim();
        if (!/easy apply/i.test(text) && !/easy apply/i.test(ariaLabel)) {
          return {
            success: false,
            requiresExternalApply: true,
            errorMessage: "Job requires applying on external company website (non-Easy Apply job)",
          };
        }
      }

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
      const continueBtn = await page.$(
        "button[aria-label*='Continue to next step'], a[aria-label*='Continue to next step'], button:has-text('Continue to next step')"
      );
      if (continueBtn && (await continueBtn.isVisible())) {
        await humanClick(page, continueBtn);
        await actionDelay();
      }
    } catch {
      // Continue normally if not present
    }

    // Wait briefly for modal or SDUI URL transition
    try {
      if (typeof page.waitForFunction === "function") {
        await page.waitForFunction(
          () => {
            return (
              window.location.href.includes("/apply/") ||
              !!document.querySelector(
                ".jobs-easy-apply-modal, div.artdeco-modal, div[role='dialog'], div[data-test-modal]"
              )
            );
          },
          { timeout: 4000 }
        );
      }
    } catch {
      // Continue normally
    }

    const isModalPresent = await this.isModalOpen(page);
    return { success: isModalPresent };
  }

  async isModalOpen(page: Page): Promise<boolean> {
    if (typeof page.url === "function" && page.url().includes("/apply/")) {
      return true;
    }
    const modal = await page.$(this.modalSelector);
    if (!modal) return false;
    return await modal.isVisible();
  }

  getModalContainerSelector(): string {
    return ".jobs-easy-apply-modal, div.artdeco-modal, div[role='dialog'], div[data-test-modal], .jobs-apply-page, [data-view-name*='apply-page'], div.jobs-apply-content, .jobs-easy-apply-form";
  }

  /**
   * Selects pre-uploaded resume radio in LinkedIn's redesign card if not already selected.
   */
  private async ensureResumeSelected(page: Page): Promise<void> {
    try {
      const resumeSection = await page.$(
        ".jobs-document-upload__title--is-required, .jobs-document-upload, div:has(> .ui-attachment--pdf), .jobs-document-upload-redesign-card__container"
      );
      if (!resumeSection) return;

      // Check if any resume is already checked
      const anyChecked = await page.$(
        'input[id*="jobsDocumentCardToggle"]:checked, .jobs-document-upload-redesign-card__container input[type="radio"]:checked, input[type="radio"][aria-checked="true"]'
      );
      if (anyChecked) return;

      // Target the first resume radio input or its toggle label
      const resumeRadio = await page.$(
        'input[id*="jobsDocumentCardToggle"], .jobs-document-upload-redesign-card__container input[type="radio"]'
      );
      if (resumeRadio) {
        const radioId = await resumeRadio.getAttribute("id");
        const label = radioId ? await page.$(`label[for="${radioId}"]`) : null;
        if (label && (await label.isVisible())) {
          await humanClick(page, label);
        } else {
          await resumeRadio.check({ force: true }).catch(() => {});
        }
        await actionDelay();
      } else {
        const toggleLabel = await page.$(
          'label.jobs-document-upload-redesign-card__toggle-label, label:has-text("Select resume"), div[aria-label="Select this resume"]'
        );
        if (toggleLabel && (await toggleLabel.isVisible())) {
          await humanClick(page, toggleLabel);
          await actionDelay();
        }
      }
    } catch (err) {
      console.warn("[LinkedInStrategy] ensureResumeSelected warning:", err);
    }
  }

  /**
   * Hook called before filling fields on a step:
   * 1. Auto-selects pre-uploaded resumes if on resume upload step.
   * 2. Unchecks 'Follow company' checkbox if present.
   */
  async beforeStepFill(page: Page, _stepIndex: number): Promise<void> {
    try {
      // 1. Pre-uploaded resume selection
      await this.ensureResumeSelected(page);

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

  /**
   * Hook called after filling fields on a step:
   * Re-verifies resume selection before clicking Next.
   */
  async afterStepFill(page: Page, _stepIndex: number): Promise<void> {
    await this.ensureResumeSelected(page);
  }

  async findNextButton(page: Page): Promise<any | null> {
    return await page.$(
      'button[aria-label*="Continue to next step"], button[aria-label*="Review your application"], ' +
      'button:has-text("Next"), button:has-text("Review"), button[data-easy-apply-next-button], ' +
      'a[aria-label*="Continue to next step"], a:has-text("Next"), a:has-text("Review"), ' +
      'button:has-text("التالي"), a:has-text("التالي"), button:has-text("مراجعة"), a:has-text("مراجعة"), ' +
      'button[data-control-name="continue_unify"], button[aria-label*="Continue to next"]'
    );
  }

  async findSubmitButton(page: Page): Promise<any | null> {
    return await page.$(
      'button[aria-label*="Submit application"], button:has-text("Submit application"), ' +
      'a[aria-label*="Submit application"], a:has-text("Submit application"), ' +
      'button:has-text("إرسال الطلب"), a:has-text("إرسال الطلب"), ' +
      'button[data-control-name="submit_unify"]'
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
