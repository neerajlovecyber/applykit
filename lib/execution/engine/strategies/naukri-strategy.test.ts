import { describe, expect, it, beforeEach } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../../../db/schema";
import { initDrizzleDb, setDb, getDb } from "../../../db";
import { NaukriApplyStrategy } from "./naukri-strategy";
import { createProfile, getQABankEntries } from "../../../db/queries";

describe("NaukriApplyStrategy Chatbot Questionnaire", () => {
  let sqlite: any;
  let strategy: NaukriApplyStrategy;
  let testProfile: any;

  beforeEach(() => {
    sqlite = getDb(":memory:");
    const drizzleClient = drizzle({ client: sqlite, schema });
    setDb(sqlite);
    initDrizzleDb(drizzleClient);

    strategy = new NaukriApplyStrategy();

    testProfile = createProfile({
      name: "Jane Dev",
      email: "jane@example.com",
      phone: "+919876543210",
      experience_years: 5,
      location: "Bangalore",
      salary_max: 1800000,
      salary_min: 1500000,
      skills: JSON.stringify(["TypeScript", "React", "Node.js"]),
    });
  });

  it("returns handled: false when no chatbot drawer is present", async () => {
    const mockPage: any = {
      $: async () => null,
      $$: async () => [],
    };

    const result = await strategy.fillStep(mockPage, testProfile, 0);
    expect(result.handled).toBe(false);
    expect(result.fieldsFilled).toBe(0);
  });

  it("answers radio options matching candidate profile and auto-saves to QA bank", async () => {
    let clickedContainer = false;
    let clickedSend = false;

    const mockDrawer: any = {
      isVisible: async () => true,
      $: async (selector: string) => {
        if (selector.includes("botMsg span")) {
          return { innerText: async () => "How many years of total experience do you have?" };
        }
        if (selector.includes("sendMsgbtn_container") || selector.includes("Send")) {
          return {
            click: async () => {
              clickedSend = true;
            },
          };
        }
        return null;
      },
      $$: async (selector: string) => {
        if (selector.includes("radio")) {
          return [
            {
              $: async () => ({ innerText: async () => "1 - 2 years" }),
              click: async () => {},
              innerText: async () => "1 - 2 years",
            },
            {
              $: async () => ({ innerText: async () => "4 - 6 years" }),
              click: async () => {
                clickedContainer = true;
              },
              innerText: async () => "4 - 6 years",
            },
          ];
        }
        return [];
      },
    };

    const mockPage: any = {
      $: async (selector: string) => {
        if (selector.includes("chatbot_Drawer")) return mockDrawer;
        return null;
      },
      evaluate: async () => {},
      keyboard: {
        press: async () => {},
        type: async () => {},
      },
    };

    const result = await strategy.fillStep(mockPage, testProfile, 0);

    expect(result.handled).toBe(true);
    expect(result.fieldsFilled).toBe(1);
    expect(clickedContainer).toBe(true);
    expect(clickedSend).toBe(true);

    // Verify auto-saved to Central QA Bank
    const qaEntries = getQABankEntries(testProfile.id);
    expect(qaEntries.length).toBeGreaterThan(0);
    expect(qaEntries[0].answer).toBe("4 - 6 years");
  });

  it("answers text input questions using profile fields and auto-saves to QA bank", async () => {
    let typedText = "";
    let clickedSend = false;

    const mockDrawer: any = {
      isVisible: async () => true,
      $: async (selector: string) => {
        if (selector.includes("botMsg span")) {
          return { innerText: async () => "What is your expected salary / CTC?" };
        }
        if (selector.includes("textArea") || selector.includes("contenteditable")) {
          return {
            isVisible: async () => true,
            focus: async () => {},
          };
        }
        if (selector.includes("sendMsgbtn_container") || selector.includes("Send")) {
          return {
            click: async () => {
              clickedSend = true;
            },
          };
        }
        return null;
      },
      $$: async () => [],
    };

    const mockPage: any = {
      $: async (selector: string) => {
        if (selector.includes("chatbot_Drawer")) return mockDrawer;
        return null;
      },
      evaluate: async () => {},
      keyboard: {
        press: async () => {},
        type: async (text: string) => {
          typedText = text;
        },
      },
    };

    const result = await strategy.fillStep(mockPage, testProfile, 1);

    expect(result.handled).toBe(true);
    expect(result.fieldsFilled).toBe(1);
    expect(typedText).toBe("1800000");
    expect(clickedSend).toBe(true);

    const qaEntries = getQABankEntries(testProfile.id);
    const salaryEntry = qaEntries.find((q) => q.question_pattern.includes("salary"));
    expect(salaryEntry).toBeDefined();
    expect(salaryEntry?.answer).toBe("1800000");
  });

  it("detects application completion banner in chatbot drawer", async () => {
    const mockDrawer: any = {
      isVisible: async () => true,
      $: async (selector: string) => {
        if (selector.includes("successfully applied")) {
          return { isVisible: async () => true };
        }
        return null;
      },
      $$: async () => [],
    };

    const mockPage: any = {
      $: async () => mockDrawer,
      evaluate: async () => {},
    };

    const result = await strategy.fillStep(mockPage, testProfile, 2);
    expect(result.handled).toBe(true);
    expect(result.completed).toBe(true);
  });
});
