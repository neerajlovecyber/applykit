import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/db";
import { workerManager } from "@/lib/execution/worker-manager";
import { enqueueTask } from "@/lib/engine/task-queue";
import { JobDiscoveryService } from "@/lib/jobs/discovery-service";
import { loginNaukriAPI } from "@/lib/jobs/adapters/naukri-api";

export function registerPlatformHandlers(): void {
  handle("platforms:get", () => dbQueries.getPlatforms());
  handle("platforms:get-by-id", (id) => dbQueries.getPlatformById(id));
  handle("platforms:update-status", ({ id, status, cookies }) =>
    dbQueries.updatePlatformStatus(id, status, cookies),
  );
  handle("platforms:update-auth-token", ({ id, authToken, status }) =>
    dbQueries.updatePlatformAuthToken(id, authToken, status),
  );

  handle("platforms:login-naukri", async ({ username, password }) => {
    dbQueries.setSetting("naukri_credentials", JSON.stringify({ username, password }));
    const result = await loginNaukriAPI(username, password);
    if (result.success && result.authToken) {
      dbQueries.updatePlatformAuthToken("naukri", result.authToken, "connected");
      return result;
    }

    console.log("[PlatformHandler] Attempting isolated browser login fallback for Naukri...");
    try {
      const pwResult = await workerManager.connectPlatform("naukri");
      if (pwResult.connected) {
        if (pwResult.authToken) {
          dbQueries.updatePlatformAuthToken("naukri", pwResult.authToken, "connected");
        } else {
          dbQueries.updatePlatformStatus("naukri", "connected");
        }
        return { success: true, authToken: pwResult.authToken };
      }
      return { success: false, errorMessage: "Naukri browser login was not completed" };
    } catch (err) {
      return { success: false, errorMessage: err instanceof Error ? err.message : String(err) };
    }
  });

  handle("platforms:update-daily-count", ({ id, count }) =>
    dbQueries.updatePlatformDailyCount(id, count),
  );
  handle("platforms:reset-daily-counts", () => dbQueries.resetPlatformDailyCounts());

  handle("naukri:launch-browser", async () => {
    const platform = dbQueries.getPlatformById("naukri");
    const cookies = platform?.auth_token
      ? [
          {
            name: "nauk_at",
            value: platform.auth_token,
            domain: ".naukri.com",
            path: "/",
            httpOnly: true,
            secure: true,
          },
        ]
      : undefined;

    await workerManager.launchBrowser("https://www.naukri.com", cookies);
    return { success: true, message: "Browser launched on Naukri.com with session" };
  });

  handle("naukri:is-connected", () => {
    const status = dbQueries.getSetting("naukri_connected");
    const platform = dbQueries.getPlatformById("naukri");
    return { connected: status === "true" || platform?.status === "connected" || !!platform?.auth_token };
  });

  handle("naukri:connect", async () => {
    try {
      console.log("[PlatformHandler] Connecting Naukri via isolated worker supervisor...");
      const result = await workerManager.connectPlatform("naukri");
      if (result.connected) {
        dbQueries.setSetting("naukri_connected", "true");
        if (result.authToken) {
          dbQueries.updatePlatformAuthToken("naukri", result.authToken, "connected");
        } else {
          dbQueries.updatePlatformStatus("naukri", "connected");
        }
        return { success: true, message: "Naukri connected successfully!" };
      }
      return { success: false, error: "Login was not completed." };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  handle("naukri:disconnect", () => {
    dbQueries.setSetting("naukri_connected", "false");
    dbQueries.updatePlatformStatus("naukri", "disconnected");
    return { success: true };
  });

  handle("naukri:auto-apply", async (payload) => {
    const { keywords, location, maxJobs, filters, pauseBeforeSubmit } = payload;
    const profile = dbQueries.getActiveProfile();
    if (!profile) return { error: "No active profile found. Please select a profile in Role Profiles." };

    console.log(`[NaukriAutoApply] Batch auto-apply requested: "${keywords}" in "${location}"...`);

    try {
      // 1. Discover or fetch jobs matching search parameters
      const discovery = new JobDiscoveryService();
      const searchRes = await discovery.executeSearch({
        source: "naukri",
        keywords: keywords || "Software Engineer",
        location: location || "bangalore",
        maxPages: Math.ceil((maxJobs || 5) / 20),
        filters,
      });

      const candidateJobs = dbQueries.getJobPostings({
        source: "naukri",
        limit: maxJobs || 5,
      });
      const results: any[] = [];
      let enqueued = 0;

      for (const storedJob of candidateJobs) {
        // Check if application already exists
        let app = dbQueries.getApplicationByJobId(storedJob.id);
        if (!app) {
          app = dbQueries.createApplication({
            job_id: storedJob.id,
            profile_id: profile.id,
            status: "queued",
          });
        }

        // Enqueue task for task queue supervisor
        const task = enqueueTask({
          kind: "apply",
          applicationId: app.id,
          jobId: storedJob.id,
          payload: {
            applicationId: app.id,
            pauseBeforeSubmit: pauseBeforeSubmit !== undefined ? pauseBeforeSubmit : true,
          },
        });

        results.push({
          jobId: storedJob.id,
          taskId: task.id,
          title: storedJob.title,
          company: storedJob.company,
          location: storedJob.location,
          status: "queued",
          success: true,
        });
        enqueued++;
      }

      console.log(`[NaukriAutoApply] Enqueued ${enqueued} application tasks (discovered: ${searchRes.newJobsAdded}).`);
      return {
        success: true,
        processed: candidateJobs.length,
        applied: enqueued,
        skipped: 0,
        failed: 0,
        results,
      };
    } catch (err) {
      console.error("[NaukriAutoApply] Error enqueuing batch apply:", err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  handle("linkedin:is-connected", () => {
    const status = dbQueries.getSetting("linkedin_connected");
    const platform = dbQueries.getPlatformById("linkedin");
    return { connected: status === "true" || platform?.status === "connected" || !!platform?.auth_token };
  });

  handle("linkedin:connect", async () => {
    try {
      console.log("[PlatformHandler] Connecting LinkedIn via isolated worker supervisor...");
      const result = await workerManager.connectPlatform("linkedin");
      if (result.connected) {
        dbQueries.setSetting("linkedin_connected", "true");
        if (result.authToken) {
          dbQueries.updatePlatformAuthToken("linkedin", result.authToken, "connected");
        } else {
          dbQueries.updatePlatformStatus("linkedin", "connected");
        }
        return { success: true, message: "LinkedIn connected successfully!" };
      }
      return { success: false, error: "Login was not completed." };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  handle("linkedin:disconnect", () => {
    dbQueries.setSetting("linkedin_connected", "false");
    dbQueries.updatePlatformStatus("linkedin", "disconnected");
    return { success: true };
  });

  handle("linkedin:auto-apply", async (payload) => {
    const { keywords, location, maxJobs, filters, pauseBeforeSubmit } = payload;
    const profile = dbQueries.getActiveProfile();
    if (!profile) return { error: "No active profile found. Please select a profile in Role Profiles." };

    console.log(`[LinkedInAutoApply] Batch auto-apply requested: "${keywords}" in "${location}"...`);

    try {
      // 1. Discover or fetch jobs matching search parameters
      const discovery = new JobDiscoveryService();
      const searchRes = await discovery.executeSearch({
        source: "linkedin",
        keywords: keywords || "Software Engineer",
        location: location || "",
        maxPages: Math.ceil((maxJobs || 5) / 10),
        filters,
      });

      const candidateJobs = dbQueries.getJobPostings({
        source: "linkedin",
        limit: maxJobs || 5,
      });
      const results: any[] = [];
      let enqueued = 0;

      for (const storedJob of candidateJobs) {
        let app = dbQueries.getApplicationByJobId(storedJob.id);
        if (!app) {
          app = dbQueries.createApplication({
            job_id: storedJob.id,
            profile_id: profile.id,
            status: "queued",
          });
        }

        const task = enqueueTask({
          kind: "apply",
          applicationId: app.id,
          jobId: storedJob.id,
          payload: {
            applicationId: app.id,
            pauseBeforeSubmit: pauseBeforeSubmit !== undefined ? pauseBeforeSubmit : true,
          },
        });

        results.push({
          jobId: storedJob.id,
          taskId: task.id,
          title: storedJob.title,
          company: storedJob.company,
          location: storedJob.location,
          status: "queued",
          success: true,
        });
        enqueued++;
      }

      console.log(`[LinkedInAutoApply] Enqueued ${enqueued} application tasks (discovered: ${searchRes.newJobsAdded}).`);
      return {
        success: true,
        processed: candidateJobs.length,
        applied: enqueued,
        skipped: 0,
        failed: 0,
        results,
      };
    } catch (err) {
      console.error("[LinkedInAutoApply] Error enqueuing batch apply:", err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });
}
