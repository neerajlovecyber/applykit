/**
 * Application Executor & Task Handler Registry.
 *
 * Connects the in-process Task Queue (`lib/engine/task-queue.ts`) to Playwright
 * browser automation execution via the deep FormAutomationEngine.
 */

import { registerTaskHandler } from "@/lib/engine/task-queue";
import { workerManager } from "./worker-manager";
import type { ApplicationExecuteOptions } from "./types";
import { getApplicationById, getJobPostingById } from "@/lib/db";

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

    console.log(`[Executor] Delegating application task ${app.id} on ${job.source} to Worker Supervisor...`);

    try {
      const result = await workerManager.executeTask<any, any>({
        taskKind: "apply",
        executeOptions,
      });

      return {
        result: {
          success: result?.success,
          status: result?.status,
          fieldsFilled: result?.fieldsFilled,
          fieldsTotal: result?.fieldsTotal,
          screenshotPath: result?.screenshotPath,
        },
        error: result?.errorMessage,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  console.log("[Executor] Execution task handlers registered with Worker Supervisor.");
}
