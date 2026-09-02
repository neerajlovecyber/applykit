/**
 * Application Executor & Task Handler Registry.
 *
 * Connects the in-process Task Queue (`lib/engine/task-queue.ts`) to Playwright
 * browser automation execution via the deep FormAutomationEngine.
 */

import { registerTaskHandler } from "@/lib/engine/task-queue";
import { createStealthPage } from "./browser-pool";
import { FormAutomationEngine } from "./engine";
import type { ApplicationExecuteOptions } from "./types";
import { getApplicationById, getJobPostingById } from "@/lib/db";

const formEngine = new FormAutomationEngine();

/**
 * Register all execution task handlers with the Task Queue.
 */
export function registerExecutionTaskHandlers(): void {
  // Handler for 'apply' task kind
  registerTaskHandler("apply", async (task, payload) => {
    const applicationId = (payload.applicationId as string) || task.application_id;
    if (!applicationId) {
      return { error: "Missing applicationId in task payload" };
    }

    const app = getApplicationById(applicationId);
    if (!app) {
      return { error: `Application not found: ${applicationId}` };
    }

    const job = getJobPostingById(app.job_id);
    if (!job) {
      return { error: `Job posting not found: ${app.job_id}` };
    }

    const executeOptions: ApplicationExecuteOptions = {
      applicationId: app.id,
      jobUrl: job.application_url || "https://linkedin.com",
      platform: job.source || "linkedin",
      profileId: app.profile_id,
      pauseBeforeSubmit: true, // Human-in-the-loop pause by default
    };

    console.log(`[Executor] Launching browser task for application ${app.id} on ${job.source}...`);

    let page;
    try {
      page = await createStealthPage({ headless: false });

      const result = await formEngine.execute(page, job.source, executeOptions);

      return {
        result: {
          success: result.success,
          status: result.status,
          fieldsFilled: result.fieldsFilled,
          fieldsTotal: result.fieldsTotal,
          screenshotPath: result.screenshotPath,
        },
        error: result.errorMessage,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {
          // ignore
        }
      }
    }
  });

  console.log("[Executor] Execution task handlers registered with FormAutomationEngine.");
}
