import { ipcMain } from "electron";
import * as dbQueries from "@/lib/main/db-queries";
import * as llmRegistry from "@/lib/providers/provider-registry";
import { fetchOpenRouterModels, fetchProviderModels } from "@/lib/providers/model-fetcher";
import { executeSearch } from "@/lib/jobs/search/search-manager";

export function registerAppHandlers(): void {
  // ═══════════════════════════════════════════════════════════
  // PROFILES
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("profiles:get", () => dbQueries.getProfiles());
  ipcMain.handle("profiles:get-active", () => dbQueries.getActiveProfile());
  ipcMain.handle("profiles:get-by-id", (_, id) => dbQueries.getProfileById(id));
  ipcMain.handle("profiles:create", (_, data) => dbQueries.createProfile(data));
  ipcMain.handle("profiles:update", (_, { id, data }) => dbQueries.updateProfile(id, data));
  ipcMain.handle("profiles:set-active", (_, id) => dbQueries.setActiveProfile(id));
  ipcMain.handle("profiles:delete", (_, id) => dbQueries.deleteProfile(id));

  // ═══════════════════════════════════════════════════════════
  // JOB POSTINGS & SEARCH SCRAPING
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("job-postings:get", (_, filters) => dbQueries.getJobPostings(filters));
  ipcMain.handle("job-postings:get-by-id", (_, id) => dbQueries.getJobPostingById(id));
  ipcMain.handle("job-postings:get-by-source", (_, { source, sourceId }) => dbQueries.getJobPostingBySourceId(source, sourceId));
  ipcMain.handle("job-postings:upsert", (_, data) => dbQueries.upsertJobPosting(data));
  ipcMain.handle("job-postings:update-state", (_, { id, state }) => dbQueries.updateJobPostingState(id, state));
  ipcMain.handle("job-postings:update-score", (_, { id, score, breakdown, explanation }) => dbQueries.updateJobPostingScore(id, score, breakdown, explanation));
  ipcMain.handle("job-postings:get-stats", () => dbQueries.getJobPostingStats());
  ipcMain.handle("search:execute", (_, { options, queryId }) => executeSearch(options, queryId));

  // ═══════════════════════════════════════════════════════════
  // APPLICATIONS
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("applications:get", (_, profileId) => dbQueries.getApplications(profileId));
  ipcMain.handle("applications:get-by-id", (_, id) => dbQueries.getApplicationById(id));
  ipcMain.handle("applications:get-by-job", (_, jobId) => dbQueries.getApplicationByJobId(jobId));
  ipcMain.handle("applications:create", (_, data) => dbQueries.createApplication(data));
  ipcMain.handle("applications:update-status", (_, { id, status, errorMessage }) => dbQueries.updateApplicationStatus(id, status, errorMessage));
  ipcMain.handle("applications:update-outcome", (_, { id, outcome, note }) => dbQueries.updateApplicationOutcome(id, outcome, note));
  ipcMain.handle("applications:update-materials", (_, { id, data }) => dbQueries.updateApplicationMaterials(id, data));
  ipcMain.handle("applications:update-fill-details", (_, { id, data }) => dbQueries.updateApplicationFillDetails(id, data));
  ipcMain.handle("applications:get-stats", () => dbQueries.getApplicationStats());

  // ═══════════════════════════════════════════════════════════
  // QA BANK
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("qa-bank:get", (_, profileId) => dbQueries.getQABankEntries(profileId));
  ipcMain.handle("qa-bank:find", (_, { profileId, pattern }) => dbQueries.findQAAnswer(profileId, pattern));
  ipcMain.handle("qa-bank:upsert", (_, data) => dbQueries.upsertQABankEntry(data));
  ipcMain.handle("qa-bank:delete", (_, id) => dbQueries.deleteQABankEntry(id));

  // ═══════════════════════════════════════════════════════════
  // SEARCH QUERIES
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("search-queries:get", (_, profileId) => dbQueries.getSearchQueries(profileId));
  ipcMain.handle("search-queries:create", (_, data) => dbQueries.createSearchQuery(data));
  ipcMain.handle("search-queries:update", (_, { id, data }) => dbQueries.updateSearchQuery(id, data));
  ipcMain.handle("search-queries:record-run", (_, { id, foundCount }) => dbQueries.recordSearchRun(id, foundCount));
  ipcMain.handle("search-queries:delete", (_, id) => dbQueries.deleteSearchQuery(id));

  // ═══════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("tasks:get", (_, status) => dbQueries.getTasks(status));
  ipcMain.handle("tasks:get-by-id", (_, id) => dbQueries.getTaskById(id));
  ipcMain.handle("tasks:create", (_, data) => dbQueries.createTask(data));
  ipcMain.handle("tasks:update-status", (_, { id, status, resultData, errorMessage }) => dbQueries.updateTaskStatus(id, status, resultData, errorMessage));
  ipcMain.handle("tasks:get-stats", () => dbQueries.getTaskStats());

  // ═══════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("documents:get", (_, profileId) => dbQueries.getDocuments(profileId));
  ipcMain.handle("documents:get-by-id", (_, id) => dbQueries.getDocumentById(id));
  ipcMain.handle("documents:insert", (_, data) => dbQueries.insertDocument(data));
  ipcMain.handle("documents:delete", (_, id) => dbQueries.deleteDocument(id));

  // ═══════════════════════════════════════════════════════════
  // AUTOMATION PLANS
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("automation-plans:get", (_, profileId) => dbQueries.getAutomationPlans(profileId));
  ipcMain.handle("automation-plans:get-by-id", (_, id) => dbQueries.getAutomationPlanById(id));
  ipcMain.handle("automation-plans:create", (_, data) => dbQueries.createAutomationPlan(data));
  ipcMain.handle("automation-plans:update", (_, { id, data }) => dbQueries.updateAutomationPlan(id, data));
  ipcMain.handle("automation-plans:record-run", (_, { id, appliedCount }) => dbQueries.recordAutomationRun(id, appliedCount));
  ipcMain.handle("automation-plans:delete", (_, id) => dbQueries.deleteAutomationPlan(id));

  // ═══════════════════════════════════════════════════════════
  // PLATFORMS (enhanced)
  // ═══════════════════════════════════════════════════════════

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

  ipcMain.handle("naukri:auto-apply", async (_, { keywords, location, maxJobs, pauseBeforeSubmit, username, password }) => {
    const profile = dbQueries.getActiveProfile();
    if (!profile) return { error: "No active profile found. Please select a profile in Role Profiles." };

    console.log(`[NaukriAutoApply] Starting search & auto-apply for keywords: "${keywords}", loc: "${location}"...`);

    // 1. Run Search Manager for Naukri
    await executeSearch({
      source: "naukri",
      keywords: keywords || "DevOps Engineer",
      location: location || "Bangalore",
      maxPages: 2,
    });

    // 2. Fetch discovered Naukri jobs
    const jobs = dbQueries.getJobPostings({ source: "naukri", limit: maxJobs || 10 });
    if (jobs.length === 0) {
      return { error: "No jobs discovered for given criteria." };
    }

    // 3. Instantiate Naukri Applier & Playwright stealth page
    const { createStealthPage } = await import("@/lib/execution/browser-pool");
    const { NaukriApplier } = await import("@/lib/execution/platforms/naukri-applier");

    const naukriApplier = new NaukriApplier();
    let page;
    const results = [];

    try {
      page = await createStealthPage({ headless: false });

      // Step 1: Perform automated Playwright login using provided or stored credentials
      const storedCredsRaw = dbQueries.getSetting("naukri_credentials");
      let storedCreds: { username?: string; password?: string } = {};
      if (storedCredsRaw) {
        try { storedCreds = JSON.parse(storedCredsRaw); } catch {}
      }

      const loginUser = username || storedCreds.username;
      const loginPass = password || storedCreds.password;
      const platform = dbQueries.getPlatformById("naukri");

      if (loginUser && loginPass) {
        console.log(`[NaukriAutoApply] Executing Playwright UI login for ${loginUser}...`);
        const loginRes = await naukriApplier.login(page, loginUser, loginPass);
        if (loginRes.authToken) {
          dbQueries.updatePlatformAuthToken("naukri", loginRes.authToken, "connected");
        }
      } else if (platform?.auth_token) {
        await page.context().addCookies([
          { name: "nauk_at", value: platform.auth_token, domain: ".naukri.com", path: "/", httpOnly: true, secure: true }
        ]);
        await page.goto("https://www.naukri.com", { waitUntil: "domcontentloaded" });
      } else {
        await page.goto("https://www.naukri.com/nlogin/login", { waitUntil: "domcontentloaded" });
      }

      for (const job of jobs.slice(0, maxJobs || 10)) {
        const app = dbQueries.createApplication({
          job_id: job.id,
          profile_id: profile.id,
          status: "pending_review",
        });

        console.log(`[NaukriAutoApply] Applying to ${job.title} at ${job.company}...`);

        const execRes = await naukriApplier.apply(page, {
          applicationId: app.id,
          jobUrl: job.application_url || `https://www.naukri.com/job-listings-${job.source_id}`,
          platform: "naukri",
          profileId: profile.id,
          pauseBeforeSubmit: !!pauseBeforeSubmit,
        });

        results.push({
          jobId: job.id,
          title: job.title,
          company: job.company,
          status: execRes.status,
          success: execRes.success,
          fieldsFilled: execRes.fieldsFilled,
          errorMessage: execRes.errorMessage,
        });
      }

      return { success: true, processed: results.length, results };
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


  // ═══════════════════════════════════════════════════════════
  // LINKEDIN AUTOMATION
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("linkedin:launch-browser", async () => {
    const { createStealthPage } = await import("@/lib/execution/browser-pool");
    const page = await createStealthPage({ headless: false });
    await page.goto("https://www.linkedin.com", { waitUntil: "domcontentloaded" });
    return { success: true, message: "Browser launched on LinkedIn.com" };
  });

  ipcMain.handle("linkedin:auto-apply", async (_, { keywords, location, maxJobs, filters, pauseBeforeSubmit, username, password }) => {
    const profile = dbQueries.getActiveProfile();
    if (!profile) return { error: "No active profile found. Please select a profile in Role Profiles." };

    console.log(`[LinkedInAutoApply] Starting batch auto-apply for keywords: "${keywords}", loc: "${location}"...`);

    const { createStealthPage } = await import("@/lib/execution/browser-pool");
    const { LinkedInApplier } = await import("@/lib/execution/platforms/linkedin-applier");

    const linkedInApplier = new LinkedInApplier();
    let page;

    try {
      page = await createStealthPage({ headless: false });

      // Store credentials if provided
      if (username && password) {
        dbQueries.setSetting("linkedin_credentials", JSON.stringify({ username, password }));
      }

      // Fall back to stored creds
      let loginUser = username;
      let loginPass = password;
      if (!loginUser || !loginPass) {
        const raw = dbQueries.getSetting("linkedin_credentials");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            loginUser = loginUser || parsed.username;
            loginPass = loginPass || parsed.password;
          } catch { /* ignore */ }
        }
      }

      const batchResult = await linkedInApplier.runBatchApply(page, {
        username: loginUser,
        password: loginPass,
        keywords: keywords || "Software Engineer",
        location: location || "",
        maxJobs: maxJobs || 10,
        filters: filters || { easyApplyOnly: true },
        pauseBeforeSubmit: !!pauseBeforeSubmit,
        profileId: profile.id,
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

  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("settings:get-all", () => dbQueries.getAllSettings());
  ipcMain.handle("settings:get", (_, key) => dbQueries.getSetting(key));
  ipcMain.handle("settings:set", (_, { key, value }) => dbQueries.setSetting(key, value));

  // ═══════════════════════════════════════════════════════════
  // LLM / VERCEL AI SDK INTEGRATION & DYNAMIC OPENROUTER DISCOVERY
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("llm:list-providers", () => llmRegistry.listProviders());
  ipcMain.handle("llm:set-active-provider", (_, id) => llmRegistry.setActiveProvider(id));
  ipcMain.handle("llm:configure-provider", (_, config) => llmRegistry.configureProvider(config));
  ipcMain.handle("llm:test-connection", (_, config) => llmRegistry.testProviderConnection(config));
  ipcMain.handle("llm:fetch-openrouter-models", () => fetchOpenRouterModels());
  ipcMain.handle("llm:fetch-provider-models", (_, { provider, apiKey }) => {
    let keyToUse = apiKey;
    if (!keyToUse || keyToUse.startsWith("•••")) {
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

  // ═══════════════════════════════════════════════════════════
  // LEGACY: Jobs & History (backward compatibility)
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle("jobs:get", (_, status) => dbQueries.getJobs(status));
  ipcMain.handle("jobs:add", (_, data) => dbQueries.addJob(data));
  ipcMain.handle("jobs:update-status", (_, { id, status, errorMessage }) => dbQueries.updateJobStatus(id, status, errorMessage));
  ipcMain.handle("jobs:remove", (_, id) => dbQueries.removeJob(id));
  ipcMain.handle("jobs:clear-completed", () => dbQueries.clearCompletedJobs());
  ipcMain.handle("jobs:get-stats", () => dbQueries.getQueueStats());

  ipcMain.handle("history:get", (_, filters) => dbQueries.getHistory(filters));
  ipcMain.handle("history:add", (_, data) => dbQueries.addHistoryEntry(data));
  ipcMain.handle("history:get-stats", () => dbQueries.getHistoryStats());

  console.log("[AppHandler] All IPC Handlers Registered.");
}

