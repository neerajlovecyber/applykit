import { app, ipcMain } from "electron";
import * as dbQueries from "@/lib/main/db-queries";
import * as llmRegistry from "@/lib/providers/provider-registry";
import { fetchOpenRouterModels, fetchProviderModels } from "@/lib/providers/model-fetcher";
import { executeSearch } from "@/lib/jobs/search/search-manager";

export function registerAppHandlers(): void {
  // ===========================================================
  // PROFILES
  // ===========================================================

  ipcMain.handle("profiles:get", () => dbQueries.getProfiles());
  ipcMain.handle("profiles:get-active", () => dbQueries.getActiveProfile());
  ipcMain.handle("profiles:get-by-id", (_, id) => dbQueries.getProfileById(id));
  ipcMain.handle("profiles:create", (_, data) => dbQueries.createProfile(data));
  ipcMain.handle("profiles:update", (_, { id, data }) => dbQueries.updateProfile(id, data));
  ipcMain.handle("profiles:set-active", (_, id) => dbQueries.setActiveProfile(id));
  ipcMain.handle("profiles:delete", (_, id) => dbQueries.deleteProfile(id));

  // ===========================================================
  // JOB POSTINGS & SEARCH SCRAPING
  // ===========================================================

  ipcMain.handle("job-postings:get", (_, filters) => dbQueries.getJobPostings(filters));
  ipcMain.handle("job-postings:get-by-id", (_, id) => dbQueries.getJobPostingById(id));
  ipcMain.handle("job-postings:get-by-source", (_, { source, sourceId }) => dbQueries.getJobPostingBySourceId(source, sourceId));
  ipcMain.handle("job-postings:upsert", (_, data) => dbQueries.upsertJobPosting(data));
  ipcMain.handle("job-postings:update-state", (_, { id, state }) => dbQueries.updateJobPostingState(id, state));
  ipcMain.handle("job-postings:update-score", (_, { id, score, breakdown, explanation }) => dbQueries.updateJobPostingScore(id, score, breakdown, explanation));
  ipcMain.handle("job-postings:get-stats", () => dbQueries.getJobPostingStats());
  ipcMain.handle("search:execute", (_, { options, queryId }) => executeSearch(options, queryId));

  // ===========================================================
  // APPLICATIONS
  // ===========================================================

  ipcMain.handle("applications:get", (_, profileId) => dbQueries.getApplications(profileId));
  ipcMain.handle("applications:get-by-id", (_, id) => dbQueries.getApplicationById(id));
  ipcMain.handle("applications:get-by-job", (_, jobId) => dbQueries.getApplicationByJobId(jobId));
  ipcMain.handle("applications:create", (_, data) => dbQueries.createApplication(data));
  ipcMain.handle("applications:update-status", (_, { id, status, errorMessage }) => dbQueries.updateApplicationStatus(id, status, errorMessage));
  ipcMain.handle("applications:update-outcome", (_, { id, outcome, note }) => dbQueries.updateApplicationOutcome(id, outcome, note));
  ipcMain.handle("applications:update-materials", (_, { id, data }) => dbQueries.updateApplicationMaterials(id, data));
  ipcMain.handle("applications:update-fill-details", (_, { id, data }) => dbQueries.updateApplicationFillDetails(id, data));
  ipcMain.handle("applications:get-with-jobs", (_, profileId) => dbQueries.getApplicationsWithJobs(profileId));
  ipcMain.handle("applications:clear-history", (_, profileId) => dbQueries.clearApplicationHistory(profileId));
  ipcMain.handle("applications:get-stats", () => dbQueries.getApplicationStats());

  // ===========================================================
  // QA BANK
  // ===========================================================

  ipcMain.handle("qa-bank:get", (_, profileId) => dbQueries.getQABankEntries(profileId));
  ipcMain.handle("qa-bank:find", (_, { profileId, pattern }) => dbQueries.findQAAnswer(profileId, pattern));
  ipcMain.handle("qa-bank:upsert", (_, data) => dbQueries.upsertQABankEntry(data));
  ipcMain.handle("qa-bank:delete", (_, id) => dbQueries.deleteQABankEntry(id));
  ipcMain.handle("qa-bank:clear-ai", (_, profileId) => dbQueries.clearAIGeneratedQABankEntries(profileId));
  ipcMain.handle("qa-bank:seed", (_, profileId) => dbQueries.seedDefaultQABank(profileId));

  // ===========================================================
  // SEARCH QUERIES
  // ===========================================================

  ipcMain.handle("search-queries:get", (_, profileId) => dbQueries.getSearchQueries(profileId));
  ipcMain.handle("search-queries:create", (_, data) => dbQueries.createSearchQuery(data));
  ipcMain.handle("search-queries:update", (_, { id, data }) => dbQueries.updateSearchQuery(id, data));
  ipcMain.handle("search-queries:record-run", (_, { id, foundCount }) => dbQueries.recordSearchRun(id, foundCount));
  ipcMain.handle("search-queries:delete", (_, id) => dbQueries.deleteSearchQuery(id));

  // ===========================================================
  // TASKS
  // ===========================================================

  ipcMain.handle("tasks:get", (_, status) => dbQueries.getTasks(status));
  ipcMain.handle("tasks:get-by-id", (_, id) => dbQueries.getTaskById(id));
  ipcMain.handle("tasks:create", (_, data) => dbQueries.createTask(data));
  ipcMain.handle("tasks:update-status", (_, { id, status, resultData, errorMessage }) => dbQueries.updateTaskStatus(id, status, resultData, errorMessage));
  ipcMain.handle("tasks:get-stats", () => dbQueries.getTaskStats());

  // ===========================================================
  // DOCUMENTS
  // ===========================================================

  ipcMain.handle("documents:get", (_, profileId) => dbQueries.getDocuments(profileId));
  ipcMain.handle("documents:get-by-id", (_, id) => dbQueries.getDocumentById(id));
  ipcMain.handle("documents:insert", (_, data) => dbQueries.insertDocument(data));
  ipcMain.handle("documents:delete", (_, id) => dbQueries.deleteDocument(id));

  // ===========================================================
  // AUTOMATION PLANS
  // ===========================================================

  ipcMain.handle("automation-plans:get", (_, profileId) => dbQueries.getAutomationPlans(profileId));
  ipcMain.handle("automation-plans:get-by-id", (_, id) => dbQueries.getAutomationPlanById(id));
  ipcMain.handle("automation-plans:create", (_, data) => dbQueries.createAutomationPlan(data));
  ipcMain.handle("automation-plans:update", (_, { id, data }) => dbQueries.updateAutomationPlan(id, data));
  ipcMain.handle("automation-plans:record-run", (_, { id, appliedCount }) => dbQueries.recordAutomationRun(id, appliedCount));
  ipcMain.handle("automation-plans:delete", (_, id) => dbQueries.deleteAutomationPlan(id));

  // ===========================================================
  // PLATFORMS (enhanced)
  // ===========================================================

  ipcMain.handle("platforms:get", () => dbQueries.getPlatforms());
  ipcMain.handle("platforms:get-by-id", (_, id) => dbQueries.getPlatformById(id));
  ipcMain.handle("platforms:update-status", (_, { id, status, cookies }) => dbQueries.updatePlatformStatus(id, status, cookies));
  ipcMain.handle("platforms:update-auth-token", (_, { id, authToken, status }) => dbQueries.updatePlatformAuthToken(id, authToken, status));
  ipcMain.handle("platforms:login-naukri", async (_, { username, password }) => {
    dbQueries.setSetting("naukri_credentials", JSON.stringify({ username, password }));
    const { loginNaukriAPI } = await import("@/lib/execution/platforms/naukri-api");
    const result = await loginNaukriAPI(username, password);
    if (result.success && result.authToken) {
      dbQueries.updatePlatformAuthToken("naukri", result.authToken, "connected");
      return result;
    }

    // Playwright UI automated login fallback
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
  ipcMain.handle("platforms:update-daily-count", (_, { id, count }) => dbQueries.updatePlatformDailyCount(id, count));
  ipcMain.handle("platforms:reset-daily-counts", () => dbQueries.resetPlatformDailyCounts());

  ipcMain.handle("naukri:launch-browser", async () => {
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

  // ===========================================================
  // NAUKRI AUTOMATION — Connect-First Flow
  // ===========================================================

  /** Check if Naukri is connected (fast check via setting / auth token). */
  ipcMain.handle("naukri:is-connected", () => {
    const status = dbQueries.getSetting("naukri_connected");
    const platform = dbQueries.getPlatformById("naukri");
    return { connected: status === "true" || platform?.status === "connected" || !!platform?.auth_token };
  });

  /**
   * Open the ApplyKit Chromium window to naukri.com/nlogin/login.
   * Polls every 2s until user logs in. Saves status and auth token on success.
   */
  ipcMain.handle("naukri:connect", async () => {
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

  /** Mark Naukri as disconnected. */
  ipcMain.handle("naukri:disconnect", () => {
    dbQueries.setSetting("naukri_connected", "false");
    dbQueries.updatePlatformStatus("naukri", "disconnected");
    return { success: true };
  });

  /** Run Naukri Auto-Apply batch loop. */
  ipcMain.handle("naukri:auto-apply", async (_, { keywords, location, maxJobs, filters, pauseBeforeSubmit, username, password }) => {
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

      // Persist results into SQLite database
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

  // ===========================================================
  // LINKEDIN AUTOMATION — Connect-First Flow
  // ===========================================================
  //
  // Strategy: ONE isolated Playwright profile (~/.applykit/browser_profile)
  // persists all sessions. User logs in once via "Connect Account" — all
  // future auto-apply runs reuse the saved session automatically.
  //

  /**
   * Check if LinkedIn is currently connected (logged in) in the persistent profile.
   * Fast check — reads from DB setting, no browser needed.
   */
  ipcMain.handle("linkedin:is-connected", () => {
    const status = dbQueries.getSetting("linkedin_connected");
    return { connected: status === "true" };
  });

  /**
   * Open the ApplyKit Chromium window and navigate to linkedin.com/login.
   * Polls every 2s until the user logs in (URL becomes /feed/).
   * Times out after 5 minutes. Saves connection status on success.
   *
   * This is a long-running IPC — the UI shows a "Waiting for login..." state.
   */
  ipcMain.handle("linkedin:connect", async () => {
    const { getSharedContext } = await import("@/lib/execution/browser-pool");
    let page: any = null;

    try {
      const ctx = await getSharedContext(false); // headless=false so user can see & log in
      page = await ctx.newPage();

      // Navigate to LinkedIn
      await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 15000 });

      console.log("[LinkedInConnect] Waiting for user to log in (up to 5 min)...");

      // Poll every 2 seconds for up to 5 minutes
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
          // Keep page open — user sees their LinkedIn feed
          return { success: true, message: "LinkedIn connected successfully!" };
        }
      }

      return { success: false, error: "Login timeout — please try again." };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  /**
   * Mark LinkedIn as disconnected (does not clear cookies — just the status flag).
   * User can reconnect anytime via the connect flow.
   */
  ipcMain.handle("linkedin:disconnect", () => {
    dbQueries.setSetting("linkedin_connected", "false");
    return { success: true };
  });

  /**
   * Run the LinkedIn Easy Apply batch loop.
   * Requires linkedin:connect to have been called first (profile has session).
   * No credentials needed — session comes from the persistent profile.
   */
  ipcMain.handle("linkedin:auto-apply", async (_, { keywords, location, maxJobs, filters, pauseBeforeSubmit }) => {
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
      // Open a NEW page in the same shared context (same LinkedIn session)
      page = await createStealthPage({ headless: false });

      const batchResult = await linkedInApplier.runBatchApply(page, {
        // No username/password — session already exists in shared profile
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

  // ===========================================================
  // SETTINGS
  // ===========================================================

  ipcMain.handle("settings:get-all", () => dbQueries.getAllSettings());
  ipcMain.handle("settings:get", (_, key) => dbQueries.getSetting(key));
  ipcMain.handle("settings:set", (_, { key, value }) => dbQueries.setSetting(key, value));

  // ===========================================================
  // LLM / VERCEL AI SDK INTEGRATION & DYNAMIC OPENROUTER DISCOVERY
  // ===========================================================

  ipcMain.handle("llm:list-providers", () => llmRegistry.listProviders());
  ipcMain.handle("llm:set-active-provider", (_, id) => llmRegistry.setActiveProvider(id));
  ipcMain.handle("llm:configure-provider", (_, config) => llmRegistry.configureProvider(config));
  ipcMain.handle("llm:test-connection", (_, config) => llmRegistry.testProviderConnection(config));
  ipcMain.handle("llm:fetch-openrouter-models", () => fetchOpenRouterModels());
  ipcMain.handle("llm:fetch-provider-models", (_, { provider, apiKey }) => {
    let keyToUse = apiKey;
    if (!keyToUse || keyToUse.startsWith("***")) {
      const savedConfig = llmRegistry.getProviderConfig(provider);
      keyToUse = savedConfig?.apiKey || "";
    }
    return fetchProviderModels(provider, keyToUse);
  });
  ipcMain.handle("llm:score-job", (_, { profileSummary, jobDescription }) => llmRegistry.scoreJobFit(profileSummary, jobDescription));
  ipcMain.handle("llm:generate-cover-letter", (_, { profileSummary, jobDescription }) => llmRegistry.generateCoverLetter(profileSummary, jobDescription));
  ipcMain.handle("llm:answer-question", (_, { profileSummary, question, context }) => llmRegistry.answerQuestion(profileSummary, question, context));
  ipcMain.handle("llm:parse-resume", (_, resumeText) => llmRegistry.parseResume(resumeText));
  ipcMain.handle("llm:tailor-resume", (_, { profileSummary, jobDescription }) => llmRegistry.tailorResume(profileSummary, jobDescription));

  // ===========================================================
  // LEGACY: Jobs & History (backward compatibility)
  // ===========================================================

  ipcMain.handle("jobs:get", (_, status) => dbQueries.getJobs(status));
  ipcMain.handle("jobs:add", (_, data) => dbQueries.addJob(data));
  ipcMain.handle("jobs:update-status", (_, { id, status, errorMessage }) => dbQueries.updateJobStatus(id, status, errorMessage));
  ipcMain.handle("jobs:remove", (_, id) => dbQueries.removeJob(id));
  ipcMain.handle("jobs:clear-completed", () => dbQueries.clearCompletedJobs());
  ipcMain.handle("jobs:get-stats", () => dbQueries.getQueueStats());

  ipcMain.handle("history:get", (_, filters) => dbQueries.getHistory(filters));
  ipcMain.handle("history:add", (_, data) => dbQueries.addHistoryEntry(data));
  ipcMain.handle("history:get-stats", () => dbQueries.getHistoryStats());

  // ===========================================================
  // APP INFO & AUTO-UPDATER
  // ===========================================================

  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("app:check-updates", async () => {
    if (!app.isPackaged) return { isPackaged: false, version: app.getVersion(), message: "Development mode — auto-updates active in packaged build." };
    try {
      const { autoUpdater } = await import("electron-updater");
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: app.getVersion(), updateInfo: result?.updateInfo };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  console.log("[AppHandler] All IPC Handlers Registered.");
}
