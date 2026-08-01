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
  ipcMain.handle("applications:create", (_, data) => dbQueries.createApplication(data));
  ipcMain.handle("applications:update-status", (_, { id, status, errorMessage }) => dbQueries.updateApplicationStatus(id, status, errorMessage));
  ipcMain.handle("applications:update-fill-details", (_, { id, details }) => dbQueries.updateApplicationFillDetails(id, details));
  ipcMain.handle("applications:update-drafts", (_, { id, coverLetter, tailoredResume }) => dbQueries.updateApplicationDrafts(id, coverLetter, tailoredResume));

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
  ipcMain.handle("tasks:create", (_, data) => dbQueries.createTask(data));
  ipcMain.handle("tasks:update-status", (_, { id, status, resultData, errorMessage }) => dbQueries.updateTaskStatus(id, status, resultData, errorMessage));

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
  ipcMain.handle("platforms:update-daily-count", (_, { id, count }) => dbQueries.updatePlatformDailyCount(id, count));
  ipcMain.handle("platforms:reset-daily-counts", () => dbQueries.resetPlatformDailyCounts());

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
  ipcMain.handle("llm:fetch-provider-models", (_, { provider, apiKey }) => fetchProviderModels(provider, apiKey));
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

  console.log("[AppHandler] All IPC Handlers Registered.");
}
