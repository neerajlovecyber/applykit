/**
 * Intelligent Form Filler Engine.
 *
 * Adapted from autoapplycv's form-heuristics.js & linkedin-easy-apply-fields.js
 * and Auto_job_applier_linkedIn's questions.py.
 *
 * Fills text inputs, selects, radio buttons, textareas, and resume attachments with
 * human-like delays and AI-fallback resolution.
 */

import type { Page, ElementHandle } from "playwright";
import type { Profile } from "@/lib/main/db-queries";
import { findQAAnswer, upsertQABankEntry } from "@/lib/main/db-queries";
import { answerQuestion } from "@/lib/providers/provider-registry";
import { keystrokeDelay, fieldDelay, randomDelay } from "@/lib/utils/delay";
import type { FormFieldResult, FormFillSummary } from "./types";

export class FormFiller {
  constructor(private readonly profile: Profile) {}

  /**
   * Scan and fill all form inputs within a container element or modal page.
   */
  async fillCurrentStep(page: Page, containerSelector = "body"): Promise<FormFillSummary> {
    const results: FormFieldResult[] = [];
    const container = await page.$(containerSelector);

    if (!container) {
      return { stepName: "Unknown", fieldsTotal: 0, fieldsFilled: 0, fieldsFailed: 0, details: [] };
    }

    // 1. Process Text Inputs & Textareas
    const textInputs = await container.$$('input[type="text"], input[type="tel"], input[type="number"], input:not([type]), textarea');
    for (const input of textInputs) {
      const res = await this.fillTextInput(page, input);
      if (res) results.push(res);
    }

    // 2. Process Select Dropdowns
    const selects = await container.$$("select");
    for (const select of selects) {
      const res = await this.fillSelectDropdown(page, select);
      if (res) results.push(res);
    }

    // 3. Process Radio Button Groups / Fieldsets
    const fieldsets = await container.$$("fieldset");
    for (const fieldset of fieldsets) {
      const res = await this.fillRadioFieldset(page, fieldset);
      if (res) results.push(res);
    }

    const filledCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return {
      stepName: "Form Step",
      fieldsTotal: results.length,
      fieldsFilled: filledCount,
      fieldsFailed: failedCount,
      details: results,
    };
  }

  /**
   * Fill a text input or textarea field.
   */
  private async fillTextInput(page: Page, input: ElementHandle<SVGElement | HTMLElement>): Promise<FormFieldResult | null> {
    try {
      const isVisible = await input.isVisible();
      if (!isVisible) return null;

      // Check if the field is a Typeahead/Combobox search field
      const isTypeahead = await input.evaluate((el) => {
        const role = el.getAttribute("role") || "";
        const autocomplete = el.getAttribute("aria-autocomplete") || "";
        const container = el.closest(
          "[data-test-single-typeahead-entity-form-component], .search-basic-typeahead, .search-vertical-typeahead, .typeahead-input, [data-test-typeahead-results]"
        );
        return role === "combobox" || autocomplete === "list" || !!container;
      });

      const currentValue = await input.inputValue();

      // Only skip regular (non-typeahead) text inputs if already filled
      if (!isTypeahead && currentValue && currentValue.trim().length > 0) {
        return { fieldType: "text", filledValue: currentValue, success: true, source: "default" };
      }

      const labelText = await this.resolveFieldLabel(input);
      const answer = await this.resolveAnswerForQuestion(labelText, "text");

      let valueToType = (currentValue && currentValue.trim().length > 0)
        ? currentValue.trim()
        : (answer?.value || "");

      if (!valueToType) {
        if (isTypeahead) {
          valueToType = this.profile.location || "Delhi";
        } else {
          return { label: labelText, fieldType: "text", success: false, source: "default", error: "No answer resolved" };
        }
      }

      // For location/city typeaheads, extract clean base city name (e.g. "Delhi NCR, India" -> "Delhi")
      if (isTypeahead && /location|city|geo/i.test(labelText + " " + (await input.getAttribute("id") || ""))) {
        const cleanCity = valueToType.split(/,|\(|\/|-|\bNCR\b/i)[0].trim();
        if (cleanCity.length >= 2) {
          valueToType = cleanCity;
        }
      }

      // Check if the input field expects a numeric answer
      const isNumericField = await input.evaluate((el) => {
        const id = el.id || "";
        const mode = el.getAttribute("inputmode") || "";
        const type = el.getAttribute("type") || "";
        return id.includes("numeric") || mode.includes("numeric") || mode.includes("decimal") || type === "number";
      });

      if (isNumericField) {
        const digitMatch = valueToType.match(/\d+(\.\d+)?/);
        if (digitMatch) {
          valueToType = digitMatch[0];
        } else {
          // If no number found in AI response, fallback to 30 for notice/days or 0
          valueToType = /notice|period|days/i.test(labelText) ? "30" : "0";
        }
      }

      // Focus & type character-by-character (from autoapplycv anti-bot behavior)
      await input.focus();
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Backspace");
      await randomDelay(100, 300);

      for (const char of valueToType) {
        await page.keyboard.type(char);
        await keystrokeDelay();
      }

      // Handle Combobox / Typeahead search dropdown selection (e.g. Location, City, Skill)
      if (isTypeahead) {
        await randomDelay(800, 1500);

        let selectedOption = false;
        try {
          const suggestionSelector = [
            "div.basic-typeahead__results li",
            "div[role='option']",
            "li.search-vertical-typeahead__list-item",
            "div.basic-typeahead__option",
            "ul.typeahead-results li",
            "div[data-test-typeahead-result]",
            ".search-basic-typeahead__results-list li",
            ".search-basic-typeahead__list-item",
            "ul[role='listbox'] li",
            "li[data-test-typeahead-option]",
          ].join(", ");

          const suggestion = await page.$(suggestionSelector);
          if (suggestion && (await suggestion.isVisible())) {
            await suggestion.click();
            selectedOption = true;
          }
        } catch {
          // ignore error and fall back to keyboard
        }

        if (!selectedOption) {
          await page.keyboard.press("ArrowDown");
          await randomDelay(300, 500);
          await page.keyboard.press("Enter");
          await randomDelay(200, 400);
        }
      }

      await fieldDelay();

      return {
        label: labelText,
        fieldType: "text",
        filledValue: valueToType,
        success: true,
        source: answer?.source || "default",
      };
    } catch (err) {
      return { fieldType: "text", success: false, source: "default", error: String(err) };
    }
  }

  /**
   * Fill a select dropdown element.
   */
  private async fillSelectDropdown(page: Page, select: ElementHandle<SVGElement | HTMLElement>): Promise<FormFieldResult | null> {
    try {
      const isVisible = await select.isVisible();
      if (!isVisible) return null;

      const labelText = await this.resolveFieldLabel(select);
      const options = await select.$$eval("option", (opts) =>
        opts.map((o) => ({ text: o.textContent?.trim() || "", value: o.value }))
      );

      const validOptions = options.filter((o) => {
        if (!o.value || !o.text) return false;
        const t = o.text.trim().toLowerCase();
        const v = o.value.trim().toLowerCase();
        return (
          !/^(select|choose|please select|select an option|--)$/i.test(t) &&
          !/^(select|choose|please select|select an option|--)$/i.test(v)
        );
      });

      if (validOptions.length === 0) return null;

      const answer = await this.resolveAnswerForQuestion(labelText, "select");
      const searchTarget = (answer?.value || "").toLowerCase().trim();

      let matched = validOptions.find(
        (o) =>
          o.text.toLowerCase().includes(searchTarget) ||
          o.value.toLowerCase().includes(searchTarget)
      );

      // Special heuristic for country code / phone code dropdowns
      if (!matched && /country|dialing|phone.*code/i.test(labelText)) {
        matched =
          validOptions.find((o) => /india|\+91/i.test(o.text) || /india|\+91/i.test(o.value)) ||
          validOptions[0];
      }

      if (!matched) {
        matched = validOptions[0];
      }

      await select.selectOption(matched.value);
      await fieldDelay();

      return {
        label: labelText,
        fieldType: "select",
        filledValue: matched.text,
        success: true,
        source: answer?.source || "default",
      };
    } catch (err) {
      return { fieldType: "select", success: false, source: "default", error: String(err) };
    }
  }

  /**
   * Fill a radio button group (fieldset).
   */
  private async fillRadioFieldset(page: Page, fieldset: ElementHandle<SVGElement | HTMLElement>): Promise<FormFieldResult | null> {
    try {
      const isVisible = await fieldset.isVisible();
      if (!isVisible) return null;

      const legend = await fieldset.$("legend, label, h3");
      const labelText = legend ? (await legend.textContent())?.trim() || "" : "";

      const radios = await fieldset.$$('input[type="radio"]');
      if (radios.length === 0) return null;

      const answer = await this.resolveAnswerForQuestion(labelText, "radio");
      const targetValue = (answer?.value || "no").toLowerCase();

      let clicked = false;
      for (const radio of radios) {
        const parentLabel = await radio.evaluate((el) => {
          const lbl = el.closest("label") || el.parentElement;
          return lbl?.textContent?.trim() || "";
        });

        if (parentLabel.toLowerCase().includes(targetValue) || (targetValue === "no" && parentLabel.toLowerCase().includes("no"))) {
          await radio.click();
          clicked = true;
          break;
        }
      }

      if (!clicked && radios.length > 0) {
        await radios[0].click(); // Fallback click
      }

      await fieldDelay();

      return {
        label: labelText,
        fieldType: "radio",
        filledValue: targetValue,
        success: true,
        source: answer?.source || "default",
      };
    } catch (err) {
      return { fieldType: "radio", success: false, source: "default", error: String(err) };
    }
  }

  /**
   * Resolve an label for an input or select element.
   */
  private async resolveFieldLabel(element: ElementHandle<SVGElement | HTMLElement>): Promise<string> {
    return element.evaluate((el) => {
      // Try <label for="id">
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl?.textContent) return labelEl.textContent.trim();
      }

      // Try parent label or container
      const container = el.closest("[data-test-form-element], .fb-dash-form-element, fieldset, div");
      const label = container?.querySelector("label, .fb-dash-form-element__label, span");
      if (label?.textContent) return label.textContent.trim();

      return el.getAttribute("aria-label") || el.getAttribute("placeholder") || "Form Question";
    });
  }

  /**
   * Answer resolution pipeline: Profile Defaults -> QA Bank -> Vercel AI SDK Fallback.
   */
  private async resolveAnswerForQuestion(
    questionText: string,
    questionType: string
  ): Promise<{ value: string; source: "profile" | "qa_bank" | "ai_generated" | "default" } | null> {
    const normQ = questionText.toLowerCase();

    // Parse structured resume data if available
    let parsed: any = null;
    if (this.profile.resume_parsed) {
      try {
        parsed = typeof this.profile.resume_parsed === "string"
          ? JSON.parse(this.profile.resume_parsed)
          : this.profile.resume_parsed;
      } catch { /* ignore */ }
    }

    // 1. Check profile & education defaults
    if (/notice|notice period|serving.*notice|remaining.*days|immediate.*joiner/i.test(normQ)) {
      return { value: "30", source: "profile" };
    }
    if (/country code|phone.*code|dialing code/i.test(normQ)) {
      const loc = (this.profile.location || "").toLowerCase();
      if (loc.includes("us") || loc.includes("states") || loc.includes("america")) return { value: "United States (+1)", source: "profile" };
      if (loc.includes("uk") || loc.includes("britain") || loc.includes("kingdom")) return { value: "United Kingdom (+44)", source: "profile" };
      return { value: "India (+91)", source: "profile" };
    }

    // Education & University heuristics
    if (/degree|qualification|major|field of study/i.test(normQ)) {
      const degree = parsed?.education?.[0]?.degree || "Bachelor of Technology in Computer Science and Engineering";
      return { value: degree, source: "profile" };
    }
    if (/university|college|institution|school/i.test(normQ)) {
      const uni = parsed?.education?.[0]?.institution || "Lovely Professional University";
      return { value: uni, source: "profile" };
    }
    if (/gpa|cgpa|grade|score|marks/i.test(normQ)) {
      const gpa = parsed?.education?.[0]?.description?.match(/\d+(\.\d+)?/)?.[0] || "8.29";
      return { value: gpa, source: "profile" };
    }
    if (/graduation year|grad year|end year|completion year/i.test(normQ)) {
      const gradYear = parsed?.education?.[0]?.years?.match(/\b20\d\d\b/g)?.pop() || "2024";
      return { value: gradYear, source: "profile" };
    }
    if (/company|employer|current.*organisation|present.*company/i.test(normQ)) {
      const comp = parsed?.workExperience?.[0]?.company || "xIoTz Private Limited";
      return { value: comp, source: "profile" };
    }
    if (/current.*title|job.*title|designation|current.*role/i.test(normQ)) {
      const title = parsed?.workExperience?.[0]?.title || "DevOps Engineer";
      return { value: title, source: "profile" };
    }

    if (/years of experience|how many years/i.test(normQ)) {
      return { value: String(this.profile.experience_years || 2), source: "profile" };
    }
    if (/visa|sponsorship|require.*visa/i.test(normQ)) {
      return { value: this.profile.visa_required ? "Yes" : "No", source: "profile" };
    }
    if (/phone|mobile/i.test(normQ)) {
      return { value: this.profile.phone || "+91 7988815263", source: "profile" };
    }
    if (/email/i.test(normQ)) {
      return { value: this.profile.email || "applicant@example.com", source: "profile" };
    }
    if (/salary|ctc|compensation/i.test(normQ)) {
      return { value: String(this.profile.salary_min || 1200000), source: "profile" };
    }
    if (/location|city/i.test(normQ)) {
      return { value: this.profile.location || "Delhi NCR, India", source: "profile" };
    }

    // 2. Check QA Bank SQLite lookup
    const bankEntry = findQAAnswer(this.profile.id, questionText);
    if (bankEntry) {
      return { value: bankEntry.answer, source: "qa_bank" };
    }

    // 3. Fallback to Vercel AI SDK completion with rich full resume context
    try {
      const eduInfo = parsed?.education?.map((e: any) => `${e.degree || ""} at ${e.institution || ""} (${e.years || ""}) ${e.description || ""}`).join("; ") || "B.Tech Computer Science, Lovely Professional University";
      const expInfo = parsed?.workExperience?.map((w: any) => `${w.title || ""} at ${w.company || ""} (${w.years || ""}): ${Array.isArray(w.description) ? w.description.join(". ") : (w.description || "")}`).join("\n") || "";

      const profileSummary = `
Candidate Name: ${this.profile.full_name || this.profile.name}
Email: ${this.profile.email || "N/A"}
Phone: ${this.profile.phone || "N/A"}
Location: ${this.profile.location || "Delhi NCR, India"}
Years of Experience: ${this.profile.experience_years || 2}
Seniority Level: ${this.profile.seniority || "mid"}
Skills: ${this.profile.skills || "AWS, Docker, Kubernetes, CI/CD, Python"}

Education & Degrees:
${eduInfo}

Work Experience & Employers:
${expInfo}

Professional Summary:
${this.profile.summary || "DevOps Engineer with experience in cloud automation and release pipelines."}
`.trim();

      const aiAns = await answerQuestion(profileSummary, questionText);
      if (aiAns) {
        // Save to QA Bank for future runs
        upsertQABankEntry({
          profile_id: this.profile.id,
          question_pattern: questionText,
          answer: aiAns,
          question_type: questionType,
          confidence: "medium",
          source: "ai_generated",
        });
        return { value: aiAns, source: "ai_generated" };
      }
    } catch (err) {
      console.error("[FormFiller] AI answer fallback error:", err);
    }

    return { value: "Yes", source: "default" };
  }
}
