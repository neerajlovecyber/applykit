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
});
