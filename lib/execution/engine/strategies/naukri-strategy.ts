/**
 * Naukri Apply Strategy.
 *
 * Encapsulates modal selectors, external apply detection, and full interactive
 * recruiter chatbot drawer (.chatbot_Drawer) questionnaires for Naukri.
 */

import type { Page } from "playwright";
import type { PlatformApplyStrategy, ModalOpenResult, StepFillResult } from "../types";
import { actionDelay, randomDelay } from "@/lib/utils/delay";
import { findQAAnswer, upsertQABankEntry } from "@/lib/db";

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
      const activeInput = await page.$("div.apply-message input, div.chatbot_Drawer input, .custom-questions input");
      return !!activeInput;
    }
    return await drawer.isVisible();
  }

  getModalContainerSelector(): string {
    return this.modalSelector;
  }

  /**
   * Interactive questionnaire filler for Naukri Recruiter Chatbot Drawer (.chatbot_Drawer).
   */
  async fillStep(page: Page, profile: any, stepIndex: number): Promise<StepFillResult> {
    const drawer = await page.$(
      ".chatbot_Drawer, div.chatbot_DrawerContentWrapper, [class*='chatbot_Drawer'], div[id*='Drawer'], .chatbot_MessageContainer"
    );

    if (!drawer || !(await drawer.isVisible().catch(() => false))) {
      // Not in chatbot drawer mode, fall back to generic FormFiller
      return { handled: false, fieldsFilled: 0 };
    }

    console.log(`[NaukriStrategy] Recruiter chatbot drawer active. Answering questionnaire step ${stepIndex + 1}...`);

    try {
      // 1. Check if application already completed
      const successBanner = await drawer.$(
        ".chatbot_MessageContainer:has-text('successfully applied'), .chatbot_MessageContainer:has-text('Thank you'), .botMsg:has-text('Applied'), div:has-text('successfully applied')"
      );
      if (successBanner && (await successBanner.isVisible().catch(() => false))) {
        console.log("[NaukriStrategy] Application success banner detected in chatbot drawer!");
        return { handled: true, fieldsFilled: 1, completed: true };
      }

      // 2. Extract recent question text from chatbot conversation
      const questionEl = await drawer.$(
        "li.botItem:last-child .botMsg span, .botMsg:last-child span, .chatbot_ListItem:last-child .botMsg"
      );
      const questionText = questionEl ? ((await questionEl.innerText().catch(() => "")) || "").trim() : "";
      if (questionText) {
        console.log(`[NaukriStrategy] Chatbot question detected: "${questionText}"`);
      }

      let answered = false;

      // 3. Check for radio buttons, chips, or option buttons
      const radioContainers = await drawer.$$(
        ".ssrc__radio-btn-container, .singleselect-radiobutton-container div, div.ssrc__radio-btn-container, div:has(> input[type='radio']), div:has(> input[type='checkbox']), .singleselect-radiobutton label, .chip, .chipsContainer .chip"
      );

      if (radioContainers.length > 0) {
        const options: {
          label: string;
          container: any;
          labelEl: any;
          inputEl: any;
        }[] = [];

        for (const container of radioContainers) {
          const labelEl = await container.$("label, .ssrc__label, span");
          const inputEl = await container.$("input, .ssrc__radio, input[type='radio'], input[type='checkbox']");

          let labelText = labelEl ? ((await labelEl.innerText().catch(() => "")) || "").trim() : "";
          if (!labelText && inputEl) {
            labelText = ((await inputEl.getAttribute("value").catch(() => "")) || (await inputEl.getAttribute("id").catch(() => "")) || "").trim();
          }
          if (!labelText) {
            labelText = ((await container.innerText().catch(() => "")) || "").trim();
          }

          if (labelText) {
            options.push({ label: labelText, container, labelEl, inputEl });
          }
        }

        if (options.length > 0) {
          // Check QA Bank first
          const qaBankEntry = questionText && profile?.id ? findQAAnswer(profile.id, questionText) : undefined;
          let selectedIdx = -1;

          if (qaBankEntry) {
            const savedAns = qaBankEntry.answer.toLowerCase();
            selectedIdx = options.findIndex(
              (o) => o.label.toLowerCase().includes(savedAns) || savedAns.includes(o.label.toLowerCase())
            );
          }

          // Fallback to intelligent profile heuristics
          if (selectedIdx === -1) {
            selectedIdx = 0;
            const userExp = Number(profile?.experience_years ?? profile?.years_experience ?? 4);

            for (let i = 0; i < options.length; i++) {
              const optText = options[i].label.toLowerCase();
              const rangeMatch = optText.match(/(\d+)\s*-\s*(\d+)/);
              if (rangeMatch) {
                const minYears = parseInt(rangeMatch[1], 10);
                const maxYears = parseInt(rangeMatch[2], 10);
                if (userExp >= minYears && userExp <= maxYears) {
                  selectedIdx = i;
                  break;
                }
              } else if (
                optText.includes("yes") ||
                optText.includes("willing") ||
                optText.includes("immediate") ||
                optText.includes("full-time") ||
                optText.includes("agree") ||
                optText.includes("relocate")
              ) {
                selectedIdx = i;
                break;
              }
            }
          }

          const targetOpt = options[selectedIdx];
          console.log(`[NaukriStrategy] Selecting chatbot option: "${targetOpt.label}"`);

          if (targetOpt.labelEl?.click) {
            await targetOpt.labelEl.click({ force: true }).catch(() => {});
          }
          if (targetOpt.inputEl?.click) {
            await targetOpt.inputEl.click({ force: true }).catch(() => {});
          }
          if (targetOpt.container?.click) {
            await targetOpt.container.click({ force: true }).catch(() => {});
          }

          // In-browser DOM event dispatch to trigger React state updates
          await page
            .evaluate((optLabel) => {
              const allLabels = Array.from(document.querySelectorAll("label, .ssrc__label, .chip"));
              const matchedLabel = allLabels.find((l) => (l.textContent || "").trim().toLowerCase() === optLabel.toLowerCase());
              if (matchedLabel) {
                (matchedLabel as HTMLElement).click();
                const forId = matchedLabel.getAttribute("for");
                if (forId) {
                  const input = document.getElementById(forId) as HTMLInputElement;
                  if (input) {
                    input.checked = true;
                    input.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                  }
                }
              }

              const allInputs = Array.from(document.querySelectorAll("input.ssrc__radio, input[type='radio'], input[type='checkbox']"));
              const matchedInput = allInputs.find((inp) => {
                const val = (inp as HTMLInputElement).value || inp.id || "";
                return val.toLowerCase() === optLabel.toLowerCase();
              }) as HTMLInputElement;

              if (matchedInput) {
                matchedInput.checked = true;
                matchedInput.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
                matchedInput.dispatchEvent(new Event("change", { bubbles: true }));
                matchedInput.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }, targetOpt.label)
            .catch(() => {});

          // Auto-save to central QA Bank for future applications
          if (questionText && profile?.id) {
            try {
              upsertQABankEntry({
                profile_id: profile.id,
                question_pattern: questionText,
                answer: targetOpt.label,
                question_type: "radio",
                confidence: "high",
                source: "naukri_chatbot",
              });
            } catch {}
          }

          await randomDelay(300, 600);
          answered = true;
        }
      }

      // 4. Check for text input or contenteditable
      const textInput = await drawer.$(
        "div.textArea, [contenteditable='true'], input[type='text'], input[type='number'], textarea"
      );

      if (textInput && (await textInput.isVisible().catch(() => false))) {
        const qaBankEntry = questionText && profile?.id ? findQAAnswer(profile.id, questionText) : undefined;
        let answerVal = qaBankEntry?.answer || "";

        if (!answerVal) {
          const qLower = questionText.toLowerCase();

          if (/comfortable|willing|alternate|6 days|saturday|office|full-time|full time|onsite|on-site|relocate|shift|travel|hybrid/i.test(qLower)) {
            answerVal = "Yes, I am comfortable with this working arrangement.";
          } else if (/why|interested|join|reason|company|motivation|looking to/i.test(qLower)) {
            answerVal = "I am excited about this role because my background and skills closely align with your requirements, and I want to contribute to the company's growth.";
          } else if (/notice|serving|available|join date|start date/i.test(qLower)) {
            answerVal = profile?.notice_period || "30 days";
          } else if (/ctc|salary|package|compensation|remuneration|expected/i.test(qLower)) {
            answerVal = String(
              profile?.salary_max ??
              profile?.salary_min ??
              profile?.expected_salary ??
              "1500000"
            );
          } else if (/location|city|residing|address|country|based|state/i.test(qLower)) {
            answerVal = profile?.location || "Bangalore";
          } else if (/experience|years|exp|working with|how many/i.test(qLower)) {
            answerVal = String(profile?.experience_years ?? profile?.years_experience ?? 5);
          } else if (/skill|technology|tool|framework|primary|tech stack|key skills/i.test(qLower)) {
            if (profile?.skills) {
              try {
                const skills = JSON.parse(profile.skills);
                answerVal = Array.isArray(skills) ? skills.join(", ") : String(profile.skills);
              } catch {
                answerVal = String(profile.skills);
              }
            }
          } else {
            answerVal = "Yes, I am interested and well-suited for this opportunity.";
          }

          if (questionText && profile?.id) {
            try {
              upsertQABankEntry({
                profile_id: profile.id,
                question_pattern: questionText,
                answer: answerVal,
                question_type: "text",
                confidence: "high",
                source: "naukri_chatbot",
              });
            } catch {}
          }
        }

        console.log(`[NaukriStrategy] Typing chatbot answer: "${answerVal}"`);
        await textInput.focus().catch(() => {});
        await page.keyboard.press("Control+A").catch(() => {});
        await page.keyboard.press("Backspace").catch(() => {});
        await page.keyboard.type(answerVal).catch(() => {});
        await randomDelay(300, 600);
        answered = true;
      }

      // 5. Click Save / Submit / Send message button inside drawer
      const sendBtn = await drawer.$(
        "#sendMsgbtn_container, .sendMsgbtn_container, .sendMsg, div.sendMsg, div.send, button:has-text('Save'), button:has-text('Submit'), button:has-text('Send')"
      );

      if (sendBtn) {
        console.log("[NaukriStrategy] Clicking Send/Submit in chatbot drawer...");
        await sendBtn.click({ force: true }).catch(() => {});
        await page
          .evaluate(() => {
            const btn = document.querySelector(".sendMsg, #sendMsgbtn_container .sendMsg, div.sendMsg");
            if (btn) (btn as HTMLElement).click();
          })
          .catch(() => {});

        await randomDelay(1200, 2000);
      }

      // Check if finished
      const isCompleted = await drawer.$(
        ".chatbot_MessageContainer:has-text('successfully applied'), .chatbot_MessageContainer:has-text('Thank you'), .botMsg:has-text('Applied')"
      );

      return {
        handled: true,
        fieldsFilled: answered ? 1 : 0,
        completed: !!isCompleted,
      };
    } catch (err) {
      console.warn("[NaukriStrategy] Warning during chatbot drawer interaction:", err);
      return { handled: true, fieldsFilled: 0, completed: false };
    }
  }

  async findNextButton(page: Page): Promise<any | null> {
    return await page.$(
      'button:has-text("Save and Next"), button:has-text("Next"), button:has-text("Continue"), button.next-btn, a:has-text("Next"), #sendMsgbtn_container .sendMsg'
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
