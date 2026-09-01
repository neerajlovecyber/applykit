import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";

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
    const { loginNaukriAPI } = await import("@/lib/execution/platforms/naukri-api");
    const result = await loginNaukriAPI(username, password);
    if (result.success && result.authToken) {
      dbQueries.updatePlatformAuthToken("naukri", result.authToken, "connected");
      return result;
    }

    console.log("[AppHandler] Running Playwright automated login fallback for Naukri...");
    const { createStealthPage } = await import("@/lib/execution/browser-pool");
    const { NaukriApplier } = await import("@/lib/execution/platforms/naukri-applier");

    let page;
    try {
      page = await createStealthPage({ headless: false });
      const naukriApplier = new NaukriApplier();
      const pwResult = await naukriApplier.login(page, username, password);

      if (pwResult.success && pwResult.authToken) {
        dbQueries.updatePlatformAuthToken("naukri", pwResult.authToken, "connected");
      }
      return pwResult;
    } catch (err) {
      return { success: false, errorMessage: err instanceof Error ? err.message : String(err) };
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
  handle("platforms:update-daily-count", ({ id, count }) =>
    dbQueries.updatePlatformDailyCount(id, count),
  );
  handle("platforms:reset-daily-counts", () => dbQueries.resetPlatformDailyCounts());

  handle("naukri:launch-browser", async () => {
    const { createStealthPage } = await import("@/lib/execution/browser-pool");
    const platform = dbQueries.getPlatformById("naukri");
    const page = await createStealthPage({ headless: false });

    if (platform?.auth_token) {
      try {
        await page.context().addCookies([
          {
            name: "nauk_at",
            value: platform.auth_token,
            domain: ".naukri.com",
            path: "/",
            httpOnly: true,
            secure: true,
          },
        ]);
      } catch (err) {
        console.error("[LaunchBrowser] Failed to set cookie:", err);
      }
    }

    await page.goto("https://www.naukri.com", { waitUntil: "domcontentloaded" });
    return { success: true, message: "Browser launched on Naukri.com with session" };
  });

  handle("naukri:is-connected", () => {
    const status = dbQueries.getSetting("naukri_connected");
    const platform = dbQueries.getPlatformById("naukri");
    return { connected: status === "true" || platform?.status === "connected" || !!platform?.auth_token };
  });

  handle("naukri:connect", async () => {
    const { getSharedContext } = await import("@/lib/execution/browser-pool");
    let page: any = null;

    try {
      const ctx = await getSharedContext(false);
      page = await ctx.newPage();

      await page.goto("https://www.naukri.com/nlogin/login", { waitUntil: "domcontentloaded", timeout: 15000 });
      console.log("[NaukriConnect] Waiting for user to log in (up to 5 min)...");

      const deadline = Date.now() + 5 * 60 * 1000;
      while (Date.now() < deadline) {
        await page.waitForTimeout(2000);
        const url: string = page.url();
        const cookies = await page.context().cookies("https://www.naukri.com");
        const naukAt = cookies.find((c: any) => c.name === "nauk_at");

        if (
          url.includes("naukri.com/mnjuser/homepage") ||
          url.includes("naukri.com/my-naukri") ||
          url.includes("naukri.com/naukri") ||
          naukAt?.value
        ) {
          console.log("[NaukriConnect] Login detected! URL:", url);
          dbQueries.setSetting("naukri_connected", "true");
          if (naukAt?.value) {
            dbQueries.updatePlatformAuthToken("naukri", naukAt.value, "connected");
          } else {
            dbQueries.updatePlatformStatus("naukri", "connected");
          }
          return { success: true, message: "Naukri connected successfully!" };
        }
      }

      return { success: false, error: "Login timeout — please try again." };
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
    const { keywords, location, maxJobs, filters, pauseBeforeSubmit, username, password } = payload;
    const profile = dbQueries.getActiveProfile();
    if (!profile) return { error: "No active profile found. Please select a profile in Role Profiles." };

    console.log(`[NaukriAutoApply] Starting batch apply: "${keywords}" in "${location}"...`);

    const { createStealthPage } = await import("@/lib/execution/browser-pool");
    const { NaukriApplier } = await import("@/lib/execution/platforms/naukri-applier");
    const naukriApplier = new NaukriApplier();
    let page: any = null;

    try {
      page = await createStealthPage({ headless: false });

      const batchResult = await naukriApplier.runBatchApply(page, {
        username,
        password,
        keywords: keywords || "Software Engineer",
        location: location || "",
        maxJobs: maxJobs || 10,
        filters: filters || {},
        pauseBeforeSubmit: !!pauseBeforeSubmit,
        profileId: profile.id,
      });

      for (const res of batchResult.results) {
        try {
          dbQueries.recordAutoApplyResult(profile.id, "naukri", {
            jobId: res.naukriJobId || res.jobId,
            title: res.title,
            company: res.company,
            location: res.location,
            status: res.status,
            success: res.success,
            fieldsFilled: res.fieldsFilled,
            errorMessage: res.errorMessage,
            screenshotPath: res.screenshotPath,
          });
        } catch (dbErr) {
          console.warn("[NaukriAutoApply] Failed to record result in DB:", dbErr);
        }
      }

      return {
        success: true,
        processed: batchResult.processed,
        applied: batchResult.applied,
        skipped: batchResult.skipped,
        failed: batchResult.failed,
        results: batchResult.results,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    } finally {
      if (page) {
        try { await page.close(); } catch { /* ignore */ }
      }
    }
  });

  handle("linkedin:is-connected", () => {
    const status = dbQueries.getSetting("linkedin_connected");
    return { connected: status === "true" };
  });

  handle("linkedin:connect", async () => {
    const { getSharedContext } = await import("@/lib/execution/browser-pool");
    let page: any = null;

    try {
      const ctx = await getSharedContext(false);
      page = await ctx.newPage();

      await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 15000 });
      console.log("[LinkedInConnect] Waiting for user to log in (up to 5 min)...");

      const deadline = Date.now() + 5 * 60 * 1000;
      while (Date.now() < deadline) {
        await page.waitForTimeout(2000);
        const url: string = page.url();
        if (
          url.includes("linkedin.com/feed") ||
          url.includes("linkedin.com/mynetwork") ||
          url.includes("linkedin.com/jobs") ||
          url.includes("linkedin.com/in/")
        ) {
          console.log("[LinkedInConnect] Login detected! URL:", url);
          dbQueries.setSetting("linkedin_connected", "true");
          return { success: true, message: "LinkedIn connected successfully!" };
        }
      }

      return { success: false, error: "Login timeout — please try again." };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  handle("linkedin:disconnect", () => {
    dbQueries.setSetting("linkedin_connected", "false");
    return { success: true };
  });

  handle("linkedin:auto-apply", async (payload) => {
    const { keywords, location, maxJobs, filters, pauseBeforeSubmit } = payload;
    const profile = dbQueries.getActiveProfile();
    if (!profile) return { error: "No active profile found. Please select a profile in Role Profiles." };

    const isConnected = dbQueries.getSetting("linkedin_connected") === "true";
    if (!isConnected) return { error: "LinkedIn not connected. Please connect your account first." };

    console.log(`[LinkedInAutoApply] Starting batch apply: "${keywords}" in "${location}"...`);

    const { createStealthPage } = await import("@/lib/execution/browser-pool");
    const { LinkedInApplier } = await import("@/lib/execution/platforms/linkedin-applier");
    const linkedInApplier = new LinkedInApplier();
    let page: any = null;

    try {
      page = await createStealthPage({ headless: false });

      const batchResult = await linkedInApplier.runBatchApply(page, {
        keywords: keywords || "Software Engineer",
        location: location || "",
        maxJobs: maxJobs || 10,
        filters: filters || { easyApplyOnly: true },
        pauseBeforeSubmit: !!pauseBeforeSubmit,
        profileId: profile.id,
        onProgress: (res) => {
          try {
            console.log(`[LinkedInAutoApply] Real-time saving job "${res.title}" @ "${res.company}" to SQLite DB...`);
            dbQueries.recordAutoApplyResult(profile.id, "linkedin", {
              jobId: res.linkedInJobId || res.jobId,
              title: res.title,
              company: res.company,
              location: res.location,
              status: res.status,
              success: res.success,
              fieldsFilled: res.fieldsFilled,
              errorMessage: res.errorMessage,
              screenshotPath: res.screenshotPath,
            });
          } catch (dbErr) {
            console.warn("[LinkedInAutoApply] Failed to record result in DB:", dbErr);
          }
        },
      });

      return {
        success: true,
        processed: batchResult.processed,
        applied: batchResult.applied,
        skipped: batchResult.skipped,
        failed: batchResult.failed,
        results: batchResult.results,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    } finally {
      if (page) {
        try { await page.close(); } catch { /* ignore */ }
      }
    }
  });
}
