/**
 * Naukri Platform Applier using Playwright.
 *
 * Adapted from Naukri-Automation reference repo & autoapplycv.
 */

import type { Page, ElementHandle } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormFiller } from "../form-filler";
import { getProfileById, updateApplicationStatus, updateApplicationFillDetails, findQAAnswer, upsertQABankEntry, type Profile } from "@/lib/db";
import { actionDelay, preSubmitDelay, randomDelay } from "@/lib/utils/delay";
import { extractNaukriAuthToken } from "./naukri-api";
import { join } from "path";
import { app } from "electron";
import { mkdirSync } from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NaukriSearchFilters {
  datePosted?: "past24Hours" | "pastWeek" | "pastMonth" | "anyTime";
  jobAgeDays?: 1 | 3 | 7 | 15 | 30 | number;
  experienceYears?: number;
  experienceLevel?: Array<"freshers" | "1to3Years" | "3to5Years" | "5to10Years" | "10plusYears">;
  workMode?: Array<"onSite" | "remote" | "hybrid">;
  easyApplyOnly?: boolean;
  minSalary?: number;
}

export interface NaukriBatchApplyOptions {
  username?: string;
  password?: string;
  keywords: string;
  location?: string;
  maxJobs?: number;
  filters?: NaukriSearchFilters;
  pauseBeforeSubmit?: boolean;
  profileId: string;
  /** Called with progress updates as jobs are processed */
  onProgress?: (result: BatchJobResult) => void;
}

export interface BatchJobResult {
  jobId: string;
  naukriJobId?: string;
  title: string;
  company: string;
  location?: string;
  status: "submitted" | "pending_review" | "failed" | "skipped";
  success: boolean;
  fieldsFilled?: number;
  errorMessage?: string;
  screenshotPath?: string;
}

export interface BatchApplyResult {
  processed: number;
  applied: number;
  skipped: number;
  failed: number;
  results: BatchJobResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a Naukri jobs search URL with filter params.
 * e.g., https://www.naukri.com/devops-jobs-in-gurugram?k=devops&l=gurugram%2C%20delhi%2Fncr%2C%20d&experience=2&jobAge=30&freshness=30
 */
function buildNaukriSearchUrl(
  keywords: string,
  location: string = "",
  filters: NaukriSearchFilters = {}
): string {
  const kwClean = keywords.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const locClean = location.trim() ? `-in-${location.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : "";
  const baseUrl = `https://www.naukri.com/${kwClean}-jobs${locClean}`;

  const params = new URLSearchParams();
  params.set("k", keywords);
  if (location) params.set("l", location);

  // Experience filter (e.g. experience=2)
  if (filters.experienceYears !== undefined && filters.experienceYears >= 0) {
    params.set("experience", String(filters.experienceYears));
  }

  // Job Age / Freshness filter (1, 3, 7, 15, 30 days)
  let jobAgeVal = filters.jobAgeDays;
  if (!jobAgeVal) {
    if (filters.datePosted === "past24Hours") jobAgeVal = 1;
    else if (filters.datePosted === "pastWeek") jobAgeVal = 7;
    else if (filters.datePosted === "pastMonth") jobAgeVal = 30;
  }

  if (jobAgeVal) {
    params.set("jobAge", String(jobAgeVal));
    params.set("freshness", String(jobAgeVal));
  }

  if (filters.workMode?.includes("remote")) params.set("wfhType", "2");
  else if (filters.workMode?.includes("hybrid")) params.set("wfhType", "3");
  else if (filters.workMode?.includes("onSite")) params.set("wfhType", "1");

  return `${baseUrl}?${params.toString()}`;
}

import { FormAutomationEngine, NaukriApplyStrategy } from "../engine";

export class NaukriApplier implements PlatformApplier {
  readonly platformId = "naukri";
  private readonly formEngine = new FormAutomationEngine();
  private readonly strategy = new NaukriApplyStrategy();

  // ── Single-Job Apply (delegated to FormAutomationEngine) ──────────────────

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    return await this.formEngine.execute(page, this.strategy, options);
  }

  // ── Batch Auto-Apply ────────────────────────────────────────────────────

  async runBatchApply(page: Page, options: NaukriBatchApplyOptions): Promise<BatchApplyResult> {
    const results: BatchJobResult[] = [];
    let applied = 0;
    let skipped = 0;
    let failed = 0;

    // Step 1: Login check / credential login
    if (options.username && options.password) {
      console.log(`[NaukriApplier] Attempting Naukri login for ${options.username}...`);
      const loginResult = await this.login(page, options.username, options.password);
      if (!loginResult.success) {
        console.warn(`[NaukriApplier] Login failed: ${loginResult.errorMessage}`);
      }
    } else {
      // Check cookies or local session
      const authToken = await extractNaukriAuthToken(page);
      if (!authToken) {
        await page.goto("https://www.naukri.com/nlogin/login", { waitUntil: "domcontentloaded" });
        console.log("[NaukriApplier] No session found. Waiting 30s for manual login...");
        try {
          await page.waitForURL("**/homepage**", { timeout: 30000 });
        } catch {
          console.warn("[NaukriApplier] Manual login timeout — proceeding anyway.");
        }
      }
    }

    // Step 2: Build search URL and navigate
    const searchUrl = buildNaukriSearchUrl(
      options.keywords,
      options.location || "",
      options.filters ?? {}
    );
    console.log(`[NaukriApplier] Navigating to search: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await randomDelay(2000, 3500);

    // Step 3: Scrape job cards across paginated search results
    // Step 3: Scrape job cards across paginated search results
    const targetApplied = options.maxJobs ?? 10;
    let totalScanned = 0;
    const maxScanLimit = Math.max(targetApplied * 5, 50); // Safety limit to avoid infinite loops
    let page_num = 1;
    const maxPages = 10;

    while (applied < targetApplied && page_num <= maxPages && totalScanned < maxScanLimit) {
      console.log(`[NaukriApplier] Scraping job cards on page ${page_num} (Applied: ${applied}/${targetApplied})...`);

      const containerSelector = [
        "div.srp-jobtuple-wrapper",
        "article.jobTuple",
        "div.cust-job-tuple",
        "div.jobTuple",
        ".list-container",
      ].join(", ");

      try {
        await page.waitForSelector(containerSelector, { timeout: 15000 });
      } catch {
        console.warn("[NaukriApplier] Job list / cards not found on page.");
        break;
      }

      // Scroll page down to lazy load cards
      await page.evaluate(() => {
        window.scrollBy(0, 400);
      });
      await randomDelay(800, 1500);

      const jobCardSelector = [
        "div.srp-jobtuple-wrapper",
        "article.jobTuple",
        "div.cust-job-tuple",
        "div.jobTuple",
      ].join(", ");

      const rawJobCards = await page.$$(jobCardSelector);
      console.log(`[NaukriApplier] Found ${rawJobCards.length} job cards on page ${page_num}.`);

      for (const card of rawJobCards) {
        if (applied >= targetApplied || totalScanned >= maxScanLimit) break;

        let title = "Unknown";
        let company = "Unknown";
        let location = "";
        let naukriJobId = "";
        let jobUrl = "";

        try {
          // Extract title & URL
          const titleEl = await card.$(
            "a.title, a.job-title, a[href*='job-listings']"
          );
          if (titleEl) {
            title = ((await titleEl.innerText()) || "").trim();
            const href = await titleEl.getAttribute("href");
            if (href) {
              jobUrl = href.startsWith("http") ? href : `https://www.naukri.com${href}`;
              const match = href.match(/-(\d{8,16})/);
              if (match) naukriJobId = match[1];
            }
          }

          // Extract company
          const companyEl = await card.$(
            "a.comp-name, a.company-name, div.comp-name, .comp-name"
          );
          if (companyEl) company = ((await companyEl.innerText()) || "").trim();

          if (!naukriJobId) {
            const attrId = await card.getAttribute("data-job-id");
            if (attrId) {
              naukriJobId = attrId;
            } else {
              const slugTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "_");
              const slugCompany = company.toLowerCase().replace(/[^a-z0-9]/g, "_");
              naukriJobId = `naukri_${slugTitle}_${slugCompany}`;
            }
          }

          // Extract location
          const locationEl = await card.$(
            "span.loc-wrap, span.locWrkp, li.location, .locWp"
          );
          if (locationEl) location = ((await locationEl.innerText()) || "").trim();

          // Check if already applied
          const appliedBadge = await card.$(
            ".already-applied, .applied-banner, span:has-text('Applied'), button:has-text('Applied')"
          );
          if (appliedBadge) {
            console.log(`[NaukriApplier] Skipping already-applied job: ${title}`);
            results.push({
              jobId: naukriJobId,
              naukriJobId,
              title,
              company,
              location,
              status: "skipped",
              success: false,
              errorMessage: "Already applied",
            });
            skipped++;
            totalScanned++;
            continue;
          }

          // Check for external company site tag
          const applyTagEl = await card.$(".apply-type, .company-site, span:has-text('company site')");
          if (applyTagEl && options.filters?.easyApplyOnly) {
            const tagText = ((await applyTagEl.innerText()) || "").toLowerCase();
            if (tagText.includes("company site")) {
              console.log(`[NaukriApplier] Skipping external company site job: ${title}`);
              results.push({
                jobId: naukriJobId,
                naukriJobId,
                title,
                company,
                location,
                status: "skipped",
                success: false,
                errorMessage: "External company site application required",
              });
              skipped++;
              totalScanned++;
              continue;
            }
          }

          // Scroll card into view
          await card.scrollIntoViewIfNeeded().catch(() => {});

          const executeOptions: ApplicationExecuteOptions = {
            applicationId: `naukri_batch_${naukriJobId}_${Date.now()}`,
            jobUrl: jobUrl || page.url(),
            platform: "naukri",
            profileId: options.profileId,
            pauseBeforeSubmit: options.pauseBeforeSubmit,
          };

          // Perform application by opening job page in page or clicking title link
          let applyResult: ApplicationExecuteResult;
          if (jobUrl) {
            // Open job page in new tab
            const newTab = await page.context().newPage();
            try {
              applyResult = await this.apply(newTab, executeOptions);
            } finally {
              await newTab.close().catch(() => {});
            }
          } else {
            await titleEl?.click();
            await actionDelay();
            const formFiller = new FormFiller(getProfileById(options.profileId)!);
            applyResult = await this.runNaukriApplyWizard(page, executeOptions, formFiller);
          }

          const jobResult: BatchJobResult = {
            jobId: naukriJobId,
            naukriJobId,
            title,
            company,
            location,
            status: applyResult.status,
            success: applyResult.success,
            fieldsFilled: applyResult.fieldsFilled,
            screenshotPath: applyResult.screenshotPath,
            errorMessage: applyResult.errorMessage,
          };

          results.push(jobResult);
          options.onProgress?.(jobResult);

          if (applyResult.success) applied++;
          else failed++;

          totalScanned++;
          await randomDelay(2000, 4000);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`[NaukriApplier] Error on job "${title}": ${errorMsg}`);
          results.push({
            jobId: naukriJobId,
            naukriJobId,
            title,
            company,
            location,
            status: "failed",
            success: false,
            errorMessage: errorMsg,
          });
          failed++;
          totalScanned++;
        }
      }

      // Next page pagination if target not yet reached
      if (applied < targetApplied && totalScanned < maxScanLimit) {
        const nextBtn = await page.$("a.styles_btn-secondary__25-fM:has-text('Next'), a.next-page, a:has-text('Next')");
        if (nextBtn) {
          await nextBtn.click();
          await randomDelay(2000, 3500);
          page_num++;
        } else {
          break;
        }
      }
    }

    console.log(`[NaukriApplier] Batch complete — Applied: ${applied}/${targetApplied}, Skipped: ${skipped}, Failed: ${failed}`);
    return { processed: totalScanned, applied, skipped, failed, results };
  }

  // ── Questionnaire & Multi-Step Wizard Loop ─────────────────────────────

  private async runNaukriApplyWizard(
    page: Page,
    options: ApplicationExecuteOptions,
    formFiller: FormFiller
  ): Promise<ApplicationExecuteResult> {
    let totalFilled = 0;
    let totalFields = 0;
    let isCompleted = false;
    let screenshotPath: string | undefined;
    const maxSteps = 8;
    const profile = getProfileById(options.profileId)!;

    for (let step = 0; step < maxSteps; step++) {
      // Direct check for Naukri Recruiter Chatbot Drawer (.chatbot_Drawer)
      const chatbotDrawer = await page.$(
        ".chatbot_Drawer, div.chatbot_DrawerContentWrapper, [class*='chatbot_Drawer'], div[id*='Drawer'], .chatbot_MessageContainer, .singleselect-radiobutton, .chatbot_Nav"
      );

      if (chatbotDrawer && (await chatbotDrawer.isVisible().catch(() => false))) {
        console.log(`[NaukriApplier] Recruiter chatbot drawer detected for job ${options.jobUrl}. Completing form step ${step + 1}...`);
        const stepResult = await this.fillNaukriChatbotStep(page, chatbotDrawer, profile);
        if (stepResult.filled) {
          totalFilled += 1;
          totalFields += 1;
        }

        // Check if application is finished (e.g. success message or no active options)
        const isSuccessMsg = await page.$(
          ".chatbot_MessageContainer:has-text('successfully applied'), .chatbot_MessageContainer:has-text('Thank you'), .botMsg:has-text('Applied'), div:has-text('successfully apply')"
        );

        if (isSuccessMsg || stepResult.completed) {
          console.log("[NaukriApplier] Chatbot questionnaire completed successfully!");
          isCompleted = true;
          screenshotPath = await this.captureAuditScreenshot(page, options.applicationId);
          break;
        }

        await randomDelay(1000, 2000);
        continue;
      }

      const modal = await page.$(
        ".questionnaire-modal, div.drawer, div.apply-message, div.chatbot-container, .apply-drawer, form.apply-form, div.custom-questions"
      );

      if (modal && (await modal.isVisible().catch(() => false))) {
        const stepSummary = await formFiller.fillCurrentStep(
          page,
          ".questionnaire-modal, div.drawer, div.apply-message, div.chatbot-container, .apply-drawer, form.apply-form"
        );
        totalFilled += stepSummary.fieldsFilled;
        totalFields += stepSummary.fieldsTotal;

        const submitBtn = await page.$(
          'button:has-text("Submit"), button:has-text("Save & Apply"), button:has-text("Submit application"), button[type="submit"]'
        );

        if (submitBtn) {
          screenshotPath = await this.captureAuditScreenshot(page, options.applicationId);
          await preSubmitDelay();

          if (options.pauseBeforeSubmit) {
            updateApplicationStatus(
              options.applicationId,
              "pending_review",
              "Naukri questionnaire filled, awaiting user approval"
            );
            updateApplicationFillDetails(options.applicationId, {
              fields_filled: totalFilled,
              fields_total: totalFields,
              screenshot_path: screenshotPath,
            });

            return {
              success: true,
              status: "pending_review",
              fieldsFilled: totalFilled,
              fieldsTotal: totalFields,
              screenshotPath,
            };
          }

          await submitBtn.click();
          await actionDelay();
          isCompleted = true;
          break;
        }

        const nextBtn = await page.$(
          'button:has-text("Continue"), button:has-text("Next"), button[aria-label*="Continue"]'
        );
        if (nextBtn) {
          await nextBtn.click();
          await randomDelay(1200, 2000);
        } else {
          isCompleted = true;
          break;
        }
      } else {
        // Quick single-click application without questionnaire modal
        isCompleted = true;
        break;
      }
    }

    await this.dismissPostApplyModal(page);

    if (isCompleted) {
      updateApplicationStatus(options.applicationId, "submitted");
      updateApplicationFillDetails(options.applicationId, {
        fields_filled: totalFilled,
        fields_total: totalFields,
        screenshot_path: screenshotPath,
      });

      return {
        success: true,
        status: "submitted",
        fieldsFilled: totalFilled,
        fieldsTotal: totalFields,
        screenshotPath,
      };
    }

    return {
      success: false,
      status: "failed",
      fieldsFilled: totalFilled,
      fieldsTotal: totalFields,
      errorMessage: "Naukri application loop did not reach completion within step limit.",
    };
  }

  /**
   * Complete an interactive step inside Naukri Recruiter Chatbot Drawer (.chatbot_Drawer)
   */
  private async fillNaukriChatbotStep(
    page: Page,
    drawer: ElementHandle<SVGElement | HTMLElement>,
    profile: Profile
  ): Promise<{ filled: boolean; completed: boolean }> {
    try {
      // 1. Extract recent question text from chatbot conversation
      const questionEl = await drawer.$(
        "li.botItem:last-child .botMsg span, .botMsg:last-child span, .chatbot_ListItem:last-child .botMsg"
      );
      const questionText = questionEl ? ((await questionEl.innerText()) || "").trim() : "";
      console.log(`[NaukriApplier] Chatbot question: "${questionText}"`);

      let answered = false;

      // 2. Check for radio buttons or checkboxes (.ssrc__radio-btn-container, .ssrc__radio, .ssrc__label, .singleselect-radiobutton)
      const radioContainers = await drawer.$$(
        ".ssrc__radio-btn-container, .singleselect-radiobutton-container div, div.ssrc__radio-btn-container, div:has(> input[type='radio']), div:has(> input[type='checkbox']), .singleselect-radiobutton label"
      );

      if (radioContainers.length > 0) {
        const options: {
          label: string;
          container: ElementHandle<SVGElement | HTMLElement>;
          labelEl: ElementHandle<SVGElement | HTMLElement> | null;
          inputEl: ElementHandle<SVGElement | HTMLElement> | null;
        }[] = [];

        for (const container of radioContainers) {
          const labelEl = await container.$("label, .ssrc__label, span");
          const inputEl = await container.$("input, .ssrc__radio, input[type='radio'], input[type='checkbox']");

          let labelText = labelEl ? ((await labelEl.innerText()) || "").trim() : "";
          if (!labelText && inputEl) {
            labelText = ((await inputEl.getAttribute("value")) || (await inputEl.getAttribute("id")) || "").trim();
          }
          if (!labelText) {
            labelText = ((await container.innerText()) || "").trim();
          }

          options.push({ label: labelText, container, labelEl, inputEl });
        }

        if (options.length > 0) {
          // 1. Check Central QA Bank for user-saved / high-confidence answer
          const qaBankEntry = questionText ? findQAAnswer(profile.id, questionText) : undefined;
          let selectedIdx = -1;

          if (qaBankEntry) {
            const savedAns = qaBankEntry.answer.toLowerCase();
            selectedIdx = options.findIndex(
              (o) => o.label.toLowerCase().includes(savedAns) || savedAns.includes(o.label.toLowerCase())
            );
          }

          // 2. Fallback to candidate profile heuristics
          if (selectedIdx === -1) {
            selectedIdx = 0;
            const userExp = profile?.experience_years ?? (profile as any)?.years_experience ?? 5;

            for (let i = 0; i < options.length; i++) {
              const optText = options[i].label.toLowerCase();

              // Match experience range (e.g. "3 - 4 years", "5 - 6 years", "6- 7 years")
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
          console.log(`[NaukriApplier] Target chatbot option: "${targetOpt.label}"`);

          // Execute multiple click strategies to guarantee check state
          if (targetOpt.labelEl) {
            await targetOpt.labelEl.click({ force: true }).catch(() => {});
          }
          if (targetOpt.inputEl) {
            await targetOpt.inputEl.click({ force: true }).catch(() => {});
          }
          await targetOpt.container.click({ force: true }).catch(() => {});

          // Execute in-browser DOM dispatch to trigger React state updates
          await page
            .evaluate((optLabel) => {
              const allLabels = Array.from(document.querySelectorAll("label, .ssrc__label"));
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

          // Store answer in Central QA Bank for future runs
          if (questionText) {
            upsertQABankEntry({
              profile_id: profile.id,
              question_pattern: questionText,
              answer: targetOpt.label,
              question_type: "radio",
              confidence: "high",
              source: "naukri_chatbot",
            });
          }

          await randomDelay(400, 800);
          answered = true;
        }
      }

      // 3. Check for text input or contenteditable text area
      const textInput = await drawer.$(
        "div.textArea, [contenteditable='true'], input[type='text'], input[type='number'], textarea"
      );

      if (textInput && (await textInput.isVisible().catch(() => false))) {
        // Step A: Check Central QA Bank first!
        const qaBankEntry = questionText ? findQAAnswer(profile.id, questionText) : undefined;
        let answerVal = qaBankEntry?.answer || "";

        if (!answerVal) {
          const qLower = questionText.toLowerCase();

          // 1. Comfortable / Work Schedule / Office / Shift / Saturday / Relocation
          if (
            /comfortable|willing|alternate|6 days|saturday|office|full-time|full time|onsite|on-site|relocate|shift|travel|hybrid/i.test(
              qLower
            )
          ) {
            answerVal = "Yes, I am comfortable with this working arrangement.";
          }
          // 2. Why interested / Why join / Company motivation
          else if (/why|interested|join|reason|company|motivation|looking to/i.test(qLower)) {
            answerVal =
              "I am excited about this role because my background and skills closely align with your requirements, and I want to contribute to the company's growth.";
          }
          // 3. Notice Period / Availability
          else if (/notice|serving|available|join date|start date/i.test(qLower)) {
            answerVal = profile?.notice_period || "30 days";
          }
          // 4. CTC / Salary Expectations
          else if (/ctc|salary|package|compensation|remuneration|expected/i.test(qLower)) {
            answerVal = profile?.expected_salary ? String(profile.expected_salary) : "1500000";
          }
          // 5. Location / City / Address
          else if (/location|city|residing|address|country|based|state/i.test(qLower)) {
            answerVal = profile?.location || "Bangalore";
          }
          // 6. Experience / Years
          else if (/experience|years|exp|working with|how many/i.test(qLower)) {
            answerVal = String(profile?.experience_years ?? (profile as any)?.years_experience ?? 5);
          }
          // 7. Skills / Tech Stack
          else if (/skill|technology|tool|framework|primary|tech stack|key skills/i.test(qLower)) {
            if (profile?.skills) {
              try {
                const skills = JSON.parse(profile.skills);
                if (Array.isArray(skills) && skills.length > 0) {
                  answerVal = skills.join(", ");
                } else {
                  answerVal = profile.skills;
                }
              } catch {
                answerVal = profile.skills;
              }
            }
          } else {
            answerVal = "Yes, I am interested and well-suited for this opportunity.";
          }

          // Save auto-resolved answer to central QA Bank for future runs
          if (questionText) {
            upsertQABankEntry({
              profile_id: profile.id,
              question_pattern: questionText,
              answer: answerVal,
              question_type: "text",
              confidence: "high",
              source: "naukri_chatbot",
            });
          }
        }

        console.log(`[NaukriApplier] Answering chatbot text prompt with: "${answerVal}"`);
        await textInput.focus();
        await page.keyboard.press("Control+A").catch(() => {});
        await page.keyboard.press("Backspace").catch(() => {});
        await page.keyboard.type(answerVal);
        await randomDelay(300, 600);
        answered = true;
      }

      // 4. Locate and click Save / Submit / Send message button
      const saveBtn = await drawer.$(
        "#sendMsgbtn_container, .sendMsgbtn_container, .sendMsg, div.sendMsg, div.send, button:has-text('Save'), button:has-text('Submit'), button:has-text('Send')"
      );

      if (saveBtn) {
        console.log("[NaukriApplier] Clicking Save/Submit button in chatbot drawer...");
        await saveBtn.click({ force: true }).catch(() => {});
        await page
          .evaluate(() => {
            const btn = document.querySelector(".sendMsg, #sendMsgbtn_container .sendMsg, div.sendMsg");
            if (btn) (btn as HTMLElement).click();
          })
          .catch(() => {});

        await randomDelay(1500, 2500);
        return { filled: true, completed: false };
      }

      return { filled: answered, completed: !answered };
    } catch (err) {
      console.warn("[NaukriApplier] Error filling chatbot step:", err);
      return { filled: false, completed: true };
    }
  }

  /**
   * Dismiss Naukri Recruiter Chatbot Drawer (.chatbot_Drawer) without filling forms.
   */
  protected async dismissChatbotDrawer(
    page: Page,
    drawerElement?: ElementHandle<SVGElement | HTMLElement> | null
  ): Promise<void> {
    try {
      console.log("[NaukriApplier] Dismissing chatbot drawer...");

      const crossSelectors = [
        ".crossIcon",
        ".chatBot-ic-cross",
        "[class*='crossIcon']",
        "[class*='chatBot-ic-cross']",
        ".chatbot_Nav .crossIcon",
        ".chatbot_Nav div",
        "div.crossIcon.chatBot.chatBot-ic-cross",
        "button.cross",
        "[aria-label='Close']",
        ".closeIcon",
      ];

      let closed = false;

      if (drawerElement) {
        for (const sel of crossSelectors) {
          const crossBtn = await drawerElement.$(sel);
          if (crossBtn && (await crossBtn.isVisible().catch(() => false))) {
            await crossBtn.click({ force: true }).catch(() => {});
            closed = true;
            console.log(`[NaukriApplier] Closed chatbot drawer via element selector: ${sel}`);
            break;
          }
        }
      }

      if (!closed) {
        for (const sel of crossSelectors) {
          const crossBtn = await page.$(sel);
          if (crossBtn && (await crossBtn.isVisible().catch(() => false))) {
            await crossBtn.click({ force: true }).catch(() => {});
            closed = true;
            console.log(`[NaukriApplier] Closed chatbot drawer via page selector: ${sel}`);
            break;
          }
        }
      }

      if (!closed) {
        const overlay = await page.$(".chatbot_Overlay, div[class*='chatbot_Overlay']");
        if (overlay && (await overlay.isVisible().catch(() => false))) {
          await overlay.click({ force: true }).catch(() => {});
          closed = true;
        }
      }

      await page.keyboard.press("Escape").catch(() => {});
      await page
        .evaluate(() => {
          const cross = document.querySelector(".crossIcon, .chatBot-ic-cross, [class*='crossIcon']");
          if (cross) (cross as HTMLElement).click();
          const drawer = document.querySelector(".chatbot_Drawer, [class*='chatbot_Drawer']");
          if (drawer) (drawer as HTMLElement).style.display = "none";
        })
        .catch(() => {});

      await randomDelay(500, 1000);
    } catch (err) {
      console.warn("[NaukriApplier] Warning while dismissing chatbot drawer:", err);
    }
  }

  /**
   * Helper to dismiss post-application dialogs / popups
   */
  private async dismissPostApplyModal(page: Page): Promise<void> {
    try {
      await randomDelay(1000, 2000);
      const postModal = await page.$(
        'div.drawer:has-text("Applied"), div.apply-message, div:has-text("Successfully Applied"), button:has-text("Done"), button:has-text("Cross"), div.chatbot_Drawer'
      );
      if (postModal) {
        const closeBtn = await postModal.$(
          'button:has-text("Done"), button.cross, button[aria-label="Close"], .close, .crossIcon, .chatBot-ic-cross'
        );
        if (closeBtn) {
          await closeBtn.click({ force: true }).catch(() => {});
        } else {
          await page.keyboard.press("Escape").catch(() => {});
        }
      }
    } catch (err) {
      console.warn("[NaukriApplier] Warning dismissPostApplyModal:", err);
    }
  }

  // ── Screenshot Utility ─────────────────────────────────────────────────

  private async captureAuditScreenshot(page: Page, applicationId: string): Promise<string> {
    try {
      const screenshotsDir = join(app.getPath("userData"), "screenshots");
      mkdirSync(screenshotsDir, { recursive: true });
      const filePath = join(screenshotsDir, `audit_${applicationId}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      return filePath;
    } catch {
      return "";
    }
  }

  // ── Playwright Login ───────────────────────────────────────────────────

  async login(page: Page, username?: string, password?: string): Promise<{ success: boolean; authToken?: string; errorMessage?: string }> {
    if (!username || !password) {
      return { success: false, errorMessage: "Username and password are required" };
    }

    try {
      console.log(`[NaukriApplier] Navigating to Naukri login page with Playwright...`);
      await page.goto("https://www.naukri.com/nlogin/login", { waitUntil: "domcontentloaded", timeout: 30000 });
      await randomDelay(1000, 2000);

      const userField = await page.$(
        "#usernameField, input[placeholder*='Email'], input[placeholder*='Username'], input[type='text']"
      );
      if (userField) {
        await userField.fill(username);
        await randomDelay(300, 700);
      }

      const passField = await page.$(
        "#passwordField, input[placeholder*='Password'], input[type='password']"
      );
      if (passField) {
        await passField.fill(password);
        await randomDelay(300, 700);
      }

      const submitBtn = await page.$(
        "button[type='submit'], button.btn-primary, button:has-text('Login')"
      );
      if (submitBtn) {
        await submitBtn.click();
        await randomDelay(3000, 5000);
      }

      const cookies = await page.context().cookies("https://www.naukri.com");
      const naukAtCookie = cookies.find((c) => c.name === "nauk_at");

      if (naukAtCookie?.value) {
        console.log("[NaukriApplier] Playwright login successful! Token acquired.");
        return { success: true, authToken: naukAtCookie.value };
      }

      const currentUrl = page.url();
      if (!currentUrl.includes("/nlogin/login")) {
        return { success: true, authToken: `nauk_session_${Date.now()}` };
      }

      return { success: false, errorMessage: "Login failed or captcha encountered." };
    } catch (err) {
      console.error("[NaukriApplier] Playwright login error:", err);
      return { success: false, errorMessage: err instanceof Error ? err.message : String(err) };
    }
  }
}
