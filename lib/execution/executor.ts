/**
 * Application Executor & Task Handler Registry.
 *
 * Connects the in-process Task Queue (`lib/engine/task-queue.ts`) to Playwright
 * browser automation appliers for LinkedIn, Naukri, Indeed, Lever, Greenhouse, and generic ATS forms.
 */

import { registerTaskHandler } from "@/lib/engine/task-queue";
import { createStealthPage } from "./browser-pool";
import { LinkedInApplier } from "./platforms/linkedin-applier";
import { NaukriApplier } from "./platforms/naukri-applier";
import { IndeedApplier } from "./platforms/indeed-applier";
import { LeverApplier } from "./platforms/lever-applier";
import { GreenhouseApplier } from "./platforms/greenhouse-applier";
import { GenericApplier } from "./platforms/generic-applier";
import type { ApplicationExecuteOptions } from "./types";
import { getApplicationById, getJobPostingById } from "@/lib/main/db-queries";

const linkedinApplier = new LinkedInApplier();
const naukriApplier = new NaukriApplier();
const indeedApplier = new IndeedApplier();
const leverApplier = new LeverApplier();
const greenhouseApplier = new GreenhouseApplier();
const genericApplier = new GenericApplier();

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

      let result;
      switch (job.source.toLowerCase()) {
        case "linkedin":
          result = await linkedinApplier.apply(page, executeOptions);
          break;
        case "naukri":
          result = await naukriApplier.apply(page, executeOptions);
          break;
        case "indeed":
          result = await indeedApplier.apply(page, executeOptions);
          break;
        case "lever":
          result = await leverApplier.apply(page, executeOptions);
          break;
        case "greenhouse":
          result = await greenhouseApplier.apply(page, executeOptions);
          break;
        default:
          result = await genericApplier.apply(page, executeOptions);
          break;
      }

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

  console.log("[Executor] Execution task handlers registered for all 5 platform appliers.");
}
