/**
 * Standard Task Handlers Registration.
 *
 * Unifies asynchronous domain workloads (form application, job discovery,
 * and resume tailoring) under the persistent TaskQueue.
 */

import { registerTaskHandler } from "./task-queue";
import { workerManager } from "@/lib/execution/worker-manager";
import { discoveryService } from "@/lib/jobs/discovery-service";
import { generateTailoredResume } from "@/lib/documents/tailor";
import { getApplicationById, getJobPostingById } from "@/lib/db";
import type { ApplicationExecuteOptions } from "@/lib/execution/types";

/**
 * Register all standard task handlers into the persistent TaskQueue.
 */
export function registerDefaultTaskHandlers(): void {
  // 1. Form Application Automation Task
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
      pauseBeforeSubmit: payload.pauseBeforeSubmit !== undefined ? Boolean(payload.pauseBeforeSubmit) : true,
    };

    console.log(`[TaskHandlers] Delegating application task ${app.id} on ${job.source} to Worker Supervisor...`);

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

  // 2. Job Discovery & Multi-Platform Search Task
  registerTaskHandler("discovery", async (_task, payload) => {
    const source = (payload.source as string) || "all";
    const keywords = (payload.keywords as string) || "";
    const location = payload.location as string | undefined;
    const maxPages = Number(payload.maxPages) || 2;
    const profileId = payload.profileId as string | undefined;
    const searchQueryId = payload.searchQueryId as string | undefined;

    console.log(`[TaskHandlers] Executing discovery task: source=${source}, keywords="${keywords}"`);

    try {
      const result = await discoveryService.executeSearch(
        {
          source,
          keywords,
          location,
          maxPages,
        },
        searchQueryId
      );

      return {
        result: {
          totalScraped: result.totalScraped,
          newJobsAdded: result.newJobsAdded,
          duplicatesSkipped: result.duplicatesSkipped,
          error: result.error,
        },
        error: result.error,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 3. Resume Tailoring Task
  registerTaskHandler("tailor", async (_task, payload) => {
    const profileId = payload.profileId as string;
    const jobId = payload.jobId as string;

    if (!profileId || !jobId) {
      return { error: "Missing profileId or jobId in tailor payload" };
    }

    try {
      const outcome = await generateTailoredResume(profileId, jobId);
      return {
        result: {
          documentId: outcome.documentId,
          matchedKeywords: outcome.result.matchedKeywords,
        },
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  console.log("[TaskHandlers] Standard task handlers registered: apply, discovery, tailor.");
}
