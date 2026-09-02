import { describe, expect, it, beforeEach } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../../db/schema";
import { initDrizzleDb, setDb, getDb } from "../../db";
import { FormAutomationEngine } from "./form-automation-engine";
import type { PlatformApplyStrategy } from "./types";
import { createProfile, createApplication, getApplicationById, upsertJobPosting } from "../../db/queries";

describe("Form Automation Engine (Candidate 3)", () => {
  let sqlite: any;
  let engine: FormAutomationEngine;
  let testProfileId: string;
  let testJobId: string;
  let testApplicationId: string;

  beforeEach(() => {
    sqlite = getDb(":memory:");
    const drizzleClient = drizzle({ client: sqlite, schema });
    setDb(sqlite);
    initDrizzleDb(drizzleClient);

    engine = new FormAutomationEngine({ maxSteps: 5, skipDelays: true });

    // Seed test profile
    const profile = createProfile({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+1234567890",
    });
    testProfileId = profile.id;

    // Seed test job
    const job = upsertJobPosting({
      source: "linkedin",
      source_id: "test-job-123",
      title: "Senior Cloud Engineer",
      company: "Acme Corp",
      application_url: "https://www.linkedin.com/jobs/view/123",
    });
    testJobId = job.id;

    // Seed application
    const app = createApplication({
      job_id: testJobId,
      profile_id: testProfileId,
      status: "queued",
    });
    testApplicationId = app.id;
  });

  it("fails immediately if profile is not found", async () => {
    const mockStrategy: PlatformApplyStrategy = {
      platform: "test-platform",
      openApplyModal: async () => ({ success: true }),
      isModalOpen: async () => true,
      getModalContainerSelector: () => "body",
      findNextButton: async () => null,
      findSubmitButton: async () => null,
    };

    const result = await engine.execute({} as any, mockStrategy, {
      applicationId: testApplicationId,
      jobUrl: "https://example.com/job/1",
      platform: "test-platform",
      profileId: "non-existent-profile",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("Profile not found");

    const app = getApplicationById(testApplicationId);
    expect(app?.status).toBe("failed");
  });

  it("handles already applied job gracefully", async () => {
    const mockStrategy: PlatformApplyStrategy = {
      platform: "test-platform",
      openApplyModal: async () => ({ success: true, alreadyApplied: true }),
      isModalOpen: async () => false,
      getModalContainerSelector: () => "body",
      findNextButton: async () => null,
      findSubmitButton: async () => null,
    };

    const result = await engine.execute({} as any, mockStrategy, {
      applicationId: testApplicationId,
      jobUrl: "https://example.com/job/1",
      platform: "test-platform",
      profileId: testProfileId,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("submitted");

    const app = getApplicationById(testApplicationId);
    expect(app?.status).toBe("submitted");
  });

  it("handles external application requirement by marking failed with clear explanation", async () => {
    const mockStrategy: PlatformApplyStrategy = {
      platform: "test-platform",
      openApplyModal: async () => ({ success: false, requiresExternalApply: true }),
      isModalOpen: async () => false,
      getModalContainerSelector: () => "body",
      findNextButton: async () => null,
      findSubmitButton: async () => null,
    };

    const result = await engine.execute({} as any, mockStrategy, {
      applicationId: testApplicationId,
      jobUrl: "https://example.com/job/1",
      platform: "test-platform",
      profileId: testProfileId,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("External company site");

    const app = getApplicationById(testApplicationId);
    expect(app?.status).toBe("failed");
  });

  it("handles failure to open modal or missing apply button", async () => {
    const mockStrategy: PlatformApplyStrategy = {
      platform: "test-platform",
      openApplyModal: async () => ({ success: false, errorMessage: "Apply button not found" }),
      isModalOpen: async () => false,
      getModalContainerSelector: () => "body",
      findNextButton: async () => null,
      findSubmitButton: async () => null,
    };

    const result = await engine.execute({} as any, mockStrategy, {
      applicationId: testApplicationId,
      jobUrl: "https://example.com/job/1",
      platform: "test-platform",
      profileId: testProfileId,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("Apply button not found");

    const app = getApplicationById(testApplicationId);
    expect(app?.status).toBe("failed");
  });

  it("pauses before submit and transitions to pending_review when pauseBeforeSubmit is true", async () => {
    const mockPage: any = {
      $: async () => null,
      $$: async () => [],
      screenshot: async () => Buffer.from("mock-screenshot"),
    };

    let submitFound = false;

    const mockStrategy: PlatformApplyStrategy = {
      platform: "test-platform",
      openApplyModal: async () => ({ success: true }),
      isModalOpen: async () => true,
      getModalContainerSelector: () => "body",
      findNextButton: async () => null,
      findSubmitButton: async () => {
        submitFound = true;
        return { click: async () => {} };
      },
    };

    const result = await engine.execute(mockPage, mockStrategy, {
      applicationId: testApplicationId,
      jobUrl: "https://example.com/job/1",
      platform: "test-platform",
      profileId: testProfileId,
      pauseBeforeSubmit: true,
    });

    expect(submitFound).toBe(true);
    expect(result.success).toBe(true);
    expect(result.status).toBe("pending_review");

    const app = getApplicationById(testApplicationId);
    expect(app?.status).toBe("pending_review");
  });

  it("submits application automatically when pauseBeforeSubmit is false", async () => {
    let submitClicked = false;
    let postModalDismissed = false;

    const mockPage: any = {
      $: async () => null,
      $$: async () => [],
      screenshot: async () => Buffer.from("mock-screenshot"),
    };

    const mockStrategy: PlatformApplyStrategy = {
      platform: "test-platform",
      openApplyModal: async () => ({ success: true }),
      isModalOpen: async () => true,
      getModalContainerSelector: () => "body",
      findNextButton: async () => null,
      findSubmitButton: async () => ({
        click: async () => {
          submitClicked = true;
        },
      }),
      dismissPostApplyModal: async () => {
        postModalDismissed = true;
      },
    };

    const result = await engine.execute(mockPage, mockStrategy, {
      applicationId: testApplicationId,
      jobUrl: "https://example.com/job/1",
      platform: "test-platform",
      profileId: testProfileId,
      pauseBeforeSubmit: false,
    });

    expect(submitClicked).toBe(true);
    expect(postModalDismissed).toBe(true);
    expect(result.success).toBe(true);
    expect(result.status).toBe("submitted");

    const app = getApplicationById(testApplicationId);
    expect(app?.status).toBe("submitted");
  });

  it("enforces maxSteps bound and exits loop safely without hanging", async () => {
    let stepCount = 0;

    const mockPage: any = {
      $: async () => null,
      $$: async () => [],
      screenshot: async () => Buffer.from("mock-screenshot"),
    };

    const mockStrategy: PlatformApplyStrategy = {
      platform: "test-platform",
      openApplyModal: async () => ({ success: true }),
      isModalOpen: async () => true,
      getModalContainerSelector: () => "body",
      findNextButton: async () => {
        stepCount++;
        return { click: async () => {} };
      },
      findSubmitButton: async () => null, // Never presents submit button
    };

    const result = await engine.execute(mockPage, mockStrategy, {
      applicationId: testApplicationId,
      jobUrl: "https://example.com/job/1",
      platform: "test-platform",
      profileId: testProfileId,
    });

    // Configured maxSteps = 5
    expect(stepCount).toBe(5);
    expect(result.status).toBe("failed");
  });

  describe("Strategy Registry & String Dispatch", () => {
    it("resolves built-in strategies by platform name case-insensitively", () => {
      expect(engine.getStrategy("greenhouse").platform).toBe("greenhouse");
      expect(engine.getStrategy("GREENHOUSE").platform).toBe("greenhouse");
      expect(engine.getStrategy("lever").platform).toBe("lever");
      expect(engine.getStrategy("reed").platform).toBe("reed");
      expect(engine.getStrategy("glassdoor").platform).toBe("glassdoor");
      expect(engine.getStrategy("linkedin").platform).toBe("linkedin");
      expect(engine.getStrategy("naukri").platform).toBe("naukri");
      expect(engine.getStrategy("indeed").platform).toBe("indeed");
    });

    it("falls back to generic strategy for unknown platforms", () => {
      const fallback = engine.getStrategy("some_unknown_ats_portal");
      expect(fallback.platform).toBe("generic");
    });

    it("dispatches execute() using platform string ID", async () => {
      const navigatedUrls: string[] = [];
      const mockPage: any = {
        goto: async (url: string) => {
          navigatedUrls.push(url);
        },
        $: async () => null,
        $$: async () => [],
        screenshot: async () => Buffer.from("mock-screenshot"),
      };

      const result = await engine.execute(mockPage, "greenhouse", {
        applicationId: testApplicationId,
        jobUrl: "https://boards.greenhouse.io/acme/jobs/123",
        platform: "greenhouse",
        profileId: testProfileId,
      });

      expect(navigatedUrls.length).toBe(1);
      expect(navigatedUrls[0]).toBe("https://boards.greenhouse.io/acme/jobs/123");
      expect(result).toBeDefined();
    });

    it("LeverStrategy normalizes job URL with /apply route", async () => {
      const navigatedUrls: string[] = [];
      const mockPage: any = {
        goto: async (url: string) => {
          navigatedUrls.push(url);
        },
        $: async () => null,
        $$: async () => [],
        screenshot: async () => Buffer.from("mock-screenshot"),
      };

      await engine.execute(mockPage, "lever", {
        applicationId: testApplicationId,
        jobUrl: "https://jobs.lever.co/acme/12345",
        platform: "lever",
        profileId: testProfileId,
      });

      expect(navigatedUrls[0]).toBe("https://jobs.lever.co/acme/12345/apply");
    });

    it("verifies container selectors and button contracts across ATS strategies", () => {
      const gh = engine.getStrategy("greenhouse");
      expect(gh.getModalContainerSelector()).toContain("form#application_form");

      const lever = engine.getStrategy("lever");
      expect(lever.getModalContainerSelector()).toContain("form#application-form");

      const reed = engine.getStrategy("reed");
      expect(reed.getModalContainerSelector()).toContain(".apply-container");

      const glassdoor = engine.getStrategy("glassdoor");
      expect(glassdoor.getModalContainerSelector()).toContain("div.modal");
    });
  });
});
