import { describe, expect, it, beforeEach } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../../../db/schema";
import { initDrizzleDb, setDb, getDb } from "../../../db";
import { LinkedInApplyStrategy } from "./linkedin-strategy";
import { FormFiller } from "../../form-filler";
import { createProfile } from "../../../db/queries";

describe("LinkedInApplyStrategy & FormFiller Contract", () => {
  let sqlite: any;
  let strategy: LinkedInApplyStrategy;
  let testProfile: any;

  beforeEach(() => {
    sqlite = getDb(":memory:");
    const drizzleClient = drizzle({ client: sqlite, schema });
    setDb(sqlite);
    initDrizzleDb(drizzleClient);

    strategy = new LinkedInApplyStrategy();

    testProfile = createProfile({
      name: "Alex Cloud",
      email: "alex@example.com",
      phone: "+15551234567",
      experience_years: 6,
      location: "San Francisco, CA",
    });
  });

  it("identifies already-applied jobs on LinkedIn posting", async () => {
    const mockPage: any = {
      goto: async () => {},
      $: async (sel: string) => {
        if (sel.includes("jobs-s-apply__applied-date") || sel.includes("Applied")) {
          return { textContent: async () => "Applied 2 days ago" };
        }
        return null;
      },
    };

    const result = await strategy.openApplyModal(mockPage, "https://www.linkedin.com/jobs/view/123");
    expect(result.success).toBe(true);
    expect(result.alreadyApplied).toBe(true);
  });

  it("clicks Easy Apply button and confirms modal opens", async () => {
    let clickedApply = false;

    const mockPage: any = {
      goto: async () => {},
      $: async (sel: string) => {
        if (sel.includes("jobs-apply-button") || sel.includes("Easy Apply")) {
          return {
            click: async () => {
              clickedApply = true;
            },
          };
        }
        if (sel.includes(".jobs-easy-apply-modal")) {
          return {
            isVisible: async () => true,
          };
        }
        return null;
      },
    };

    const result = await strategy.openApplyModal(mockPage, "https://www.linkedin.com/jobs/view/456");
    expect(clickedApply).toBe(true);
    expect(result.success).toBe(true);
  });

  it("identifies and clicks modern SDUI anchor-based Easy Apply links", async () => {
    let clickedSdui = false;

    const mockPage: any = {
      goto: async () => {},
      url: () => "https://www.linkedin.com/jobs/view/4463439792/apply/?openSDUIApplyFlow=true",
      $: async (sel: string) => {
        if (sel.includes("openSDUIApplyFlow=true") || sel.includes("Easy Apply to this job") || sel.includes("Easy Apply")) {
          return {
            click: async () => {
              clickedSdui = true;
            },
          };
        }
        return null;
      },
    };

    const result = await strategy.openApplyModal(mockPage, "https://www.linkedin.com/jobs/view/4463439792/");
    expect(clickedSdui).toBe(true);
    expect(result.success).toBe(true);
  });

  it("detects external company website apply links and marks requiresExternalApply", async () => {
    const mockPage: any = {
      goto: async () => {},
      $: async (sel: string) => {
        if (sel.includes("Apply on company website") || sel.includes("/safety/go") || sel.includes("link-external-medium")) {
          return { type: "external-link" };
        }
        return null;
      },
    };

    const result = await strategy.openApplyModal(mockPage, "https://www.linkedin.com/jobs/view/789");
    expect(result.success).toBe(false);
    expect(result.requiresExternalApply).toBe(true);
    expect(result.errorMessage).toContain("external company website");
  });

  it("locates LinkedIn navigation buttons correctly", async () => {
    const mockPage: any = {
      $: async (sel: string) => {
        if (sel.includes("Continue to next step") || sel.includes("Next")) {
          return { type: "next" };
        }
        if (sel.includes("Submit application")) {
          return { type: "submit" };
        }
        return null;
      },
    };

    const nextBtn = await strategy.findNextButton(mockPage);
    expect(nextBtn).toBeDefined();

    const submitBtn = await strategy.findSubmitButton(mockPage);
    expect(submitBtn).toBeDefined();
  });

  it("selects pre-uploaded resume radio in beforeStepFill", async () => {
    let clickedLabel = false;
    const mockPage: any = {
      $: async (sel: string) => {
        if (sel.includes(":checked")) {
          return null; // Not checked yet
        }
        if (sel.includes("jobsDocumentCardToggle-ember229")) {
          return {
            isVisible: async () => true,
            click: async () => {
              clickedLabel = true;
            },
          };
        }
        if (sel.includes("jobsDocumentCardToggle")) {
          return {
            getAttribute: async (attr: string) => (attr === "id" ? "jobsDocumentCardToggle-ember229" : null),
            check: async () => {},
          };
        }
        if (sel.includes("jobs-document-upload")) {
          return { type: "resume-section" };
        }
        return null;
      },
    };

    await strategy.beforeStepFill(mockPage, 1);
    expect(clickedLabel).toBe(true);
  });

  it("FormFiller resolves phone number answer for profile", async () => {
    const formFiller = new FormFiller(testProfile);

    // Directly test the answer resolution pipeline instead of full DOM execution
    // (FormFiller.fillCurrentStep uses element.evaluate which calls browser APIs not available in Bun)
    const result = (formFiller as any).resolveAnswerForQuestion("Mobile Phone Number", "text");
    const answer = await result;

    expect(answer).not.toBeNull();
    expect(answer!.value).toBe("+15551234567");
    expect(answer!.source).toBe("profile");
  });

  it("FormFiller resolves notice period from profile defaults", async () => {
    const formFiller = new FormFiller(testProfile);
    const answer = await (formFiller as any).resolveAnswerForQuestion("What is your notice period?", "text");
    expect(answer).not.toBeNull();
    expect(answer!.value).toBe("30 days");
  });

  it("FormFiller resolves work authorization heuristic answers", async () => {
    const formFiller = new FormFiller(testProfile);
    const answer = await (formFiller as any).resolveAnswerForQuestion("Are you authorized to work in the US?", "radio");
    expect(answer).not.toBeNull();
    expect(answer!.value).toBe("Yes");
  });
});
