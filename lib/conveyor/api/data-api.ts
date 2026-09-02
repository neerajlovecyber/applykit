/**
 * Data API Client for Conveyor IPC.
 *
 * Provides type-safe access to Electron Main Process IPC channels from the Renderer UI.
 * Backed by runtime-validated schemas and TypeScript inferred contracts.
 */

import type { ElectronAPI } from "@electron-toolkit/preload";
import { ConveyorApi } from "@/lib/preload/shared";
import type { Profile, JobPosting, AutomationPlan } from "../schemas";

export class DataApi extends ConveyorApi {
  constructor(api: ElectronAPI) {
    super(api);
  }

  // ── Profiles ─────────────────────────────────────────────────────────────
  getProfiles = () => this.invoke("profiles:get");
  getActiveProfile = () => this.invoke("profiles:get-active");
  getProfileById = (id: string) => this.invoke("profiles:get-by-id", id);
  createProfile = (data: Partial<Profile>) => this.invoke("profiles:create", data);
  updateProfile = (id: string, data: Partial<Profile>) => this.invoke("profiles:update", { id, data });
  upsertProfile = (id: string, data: Partial<Profile>) => this.invoke("profiles:update", { id, data });
  setActiveProfile = (id: string) => this.invoke("profiles:set-active", id);
  deleteProfile = (id: string) => this.invoke("profiles:delete", id);

  // ── Job Postings ─────────────────────────────────────────────────────────
  getJobPostings = (filters?: { state?: string; source?: string; minScore?: number; limit?: number; offset?: number }) =>
    this.invoke("job-postings:get", filters);
  getJobPostingById = (id: string) => this.invoke("job-postings:get-by-id", id);
  getJobPostingBySource = (source: string, sourceId: string) =>
    this.invoke("job-postings:get-by-source", { source, sourceId });
  upsertJobPosting = (data: Partial<JobPosting> & { source: string; source_id: string; title: string; company: string }) =>
    this.invoke("job-postings:upsert", data as any);
  updateJobPostingState = (id: string, state: string) =>
    this.invoke("job-postings:update-state", { id, state });
  updateJobPostingScore = (id: string, score: number, breakdown?: string, explanation?: string) =>
    this.invoke("job-postings:update-score", { id, score, breakdown, explanation });
  getJobPostingStats = () => this.invoke("job-postings:get-stats");

  // ── Applications ─────────────────────────────────────────────────────────
  getApplications = (filters?: { status?: string; outcome?: string; profileId?: string; limit?: number }) =>
    this.invoke("applications:get", filters?.profileId);
  getApplicationsWithJobs = (profileId?: string) => this.invoke("applications:get-with-jobs", profileId);
  clearApplicationHistory = (profileId?: string) => this.invoke("applications:clear-history", profileId);
  getApplicationById = (id: string) => this.invoke("applications:get-by-id", id);
  getApplicationByJobId = (jobId: string) => this.invoke("applications:get-by-job", jobId);
  createApplication = (data: { job_id: string; profile_id: string; status?: string; resume_version?: string; cover_letter?: string }) =>
    this.invoke("applications:create", data);
  updateApplicationStatus = (id: string, status: string, reason?: string) =>
    this.invoke("applications:update-status", { id, status, errorMessage: reason });
  updateApplicationOutcome = (id: string, outcome: string, note?: string) =>
    this.invoke("applications:update-outcome", { id, outcome, note });
  updateApplicationMaterials = (id: string, data: { resume_version?: string; cover_letter?: string; qa_responses?: string }) =>
    this.invoke("applications:update-materials", { id, data });
  updateApplicationFillDetails = (id: string, data: { fields_filled: number; fields_total: number; fill_details?: string; screenshot_path?: string }) =>
    this.invoke("applications:update-fill-details", { id, data });
  getApplicationStats = () => this.invoke("applications:get-stats");

  // ── QA Bank ──────────────────────────────────────────────────────────────
  getQABankEntries = (profileId: string) => this.invoke("qa-bank:get", profileId);
  findQAAnswer = (profileId: string, questionPattern: string) =>
    this.invoke("qa-bank:find-answer", { profileId, questionPattern });
  upsertQABankEntry = (data: { profile_id: string; question_pattern: string; answer: string; question_type?: string; confidence?: string; source?: string }) =>
    this.invoke("qa-bank:upsert", data as any);
  incrementQAUsage = (id: string) => this.invoke("qa-bank:increment-usage", id);
  deleteQABankEntry = (id: string) => this.invoke("qa-bank:delete", id);
  clearAIGeneratedQABankEntries = (profileId: string) => this.invoke("qa-bank:clear-ai", profileId);
  seedDefaultQABank = (profileId: string) => this.invoke("qa-bank:seed", profileId);

  // ── Search & Search Queries ──────────────────────────────────────────────
  executeSearch = (options: any, queryId?: string) => this.invoke("search:execute", { options, queryId });
  getSearchQueries = (profileId?: string) => this.invoke("search-queries:get", profileId);
  getSearchQueryById = (id: string) => this.invoke("search-queries:get-by-id", id);
  createSearchQuery = (data: { profile_id: string; source: string; keywords: string; location?: string; filters?: string; max_pages?: number; run_interval_hours?: number }) =>
    this.invoke("search-queries:create", data as any);
  updateSearchQueryStatus = (id: string, status: string) =>
    this.invoke("search-queries:update-status", { id, status });
  deleteSearchQuery = (id: string) => this.invoke("search-queries:delete", id);

  // ── Tasks ────────────────────────────────────────────────────────────────
  getTasks = (filters?: { status?: string; kind?: string; limit?: number }) =>
    this.invoke("tasks:get", filters?.status);
  getTaskById = (id: string) => this.invoke("tasks:get-by-id", id);
  createTask = (data: { kind: string; payload?: string; job_id?: string; application_id?: string; parent_task_id?: string; scheduled_for?: string; max_attempts?: number }) =>
    this.invoke("tasks:create", data as any);
  updateTaskStatus = (id: string, status: string, result?: string, error?: string) =>
    this.invoke("tasks:update-status", { id, status, result, error });
  getTaskStats = () => this.invoke("tasks:get-stats");

  // ── Documents ────────────────────────────────────────────────────────────
  getDocuments = (profileId: string, _docType?: string) => this.invoke("documents:get", profileId);
  getDocumentById = (id: string) => this.invoke("documents:get-by-id", id);
  createDocument = (data: { profile_id: string; doc_type: string; display_name: string; file_path: string; [key: string]: any }) =>
    this.invoke("documents:insert", data as any);
  insertDocument = (data: { profile_id: string; doc_type: string; display_name: string; file_path: string; [key: string]: any }) =>
    this.invoke("documents:insert", data as any);
  deleteDocument = (id: string) => this.invoke("documents:delete", id);
  intakeDocument = (options: { filePath?: string; rawText?: string; profileId?: string; profileTrackName?: string }) =>
    this.invoke("documents:intake", options);
  pickDocumentFile = () => this.invoke("documents:pick-file");

  // ── Automation Plans ─────────────────────────────────────────────────────
  getAutomationPlans = (profileId?: string) => this.invoke("automation-plans:get", profileId);
  getAutomationPlanById = (id: string) => this.invoke("automation-plans:get-by-id", id);
  createAutomationPlan = (data: { profile_id: string; name: string; steps: string; auto_apply?: number; min_match_score?: number; max_applies_per_run?: number; run_interval_hours?: number }) =>
    this.invoke("automation-plans:create", data as any);
  updateAutomationPlan = (id: string, data: Partial<AutomationPlan>) =>
    this.invoke("automation-plans:update", { id, data });
  deleteAutomationPlan = (id: string) => this.invoke("automation-plans:delete", id);

  // ── Platforms & Connections ──────────────────────────────────────────────
  getPlatforms = () => this.invoke("platforms:get");
  getPlatformById = (id: string) => this.invoke("platforms:get-by-id", id);
  updatePlatformStatus = (id: string, status: string, cookies?: string) =>
    this.invoke("platforms:update-status", { id, status, cookies });
  updatePlatformAuthToken = (id: string, authToken: string, status: string = "connected") =>
    this.invoke("platforms:update-auth-token", { id, authToken, status });
  loginNaukri = (credentials: { username: string; password?: string }) =>
    this.invoke("platforms:login-naukri", { username: credentials.username, password: credentials.password || "" });
  updatePlatformDailyCount = (id: string, count: number) =>
    this.invoke("platforms:update-daily-count", { id, count });
  resetPlatformDailyCounts = () => this.invoke("platforms:reset-daily-counts");

  // ── Naukri Platform Flow ─────────────────────────────────────────────────
  isNaukriConnected = () => this.invoke("naukri:is-connected");
  connectNaukri = () => this.invoke("naukri:connect");
  disconnectNaukri = () => this.invoke("naukri:disconnect");
  runNaukriAutoApply = (options: any) => this.invoke("naukri:auto-apply", options);
  launchNaukriBrowser = () => this.invoke("naukri:launch-browser");

  // ── LinkedIn Platform Flow ───────────────────────────────────────────────
  isLinkedInConnected = () => this.invoke("linkedin:is-connected");
  connectLinkedIn = () => this.invoke("linkedin:connect");
  disconnectLinkedIn = () => this.invoke("linkedin:disconnect");
  runLinkedInAutoApply = (options: any) => this.invoke("linkedin:auto-apply", options);

  // ── Settings ─────────────────────────────────────────────────────────────
  getAllSettings = () => this.invoke("settings:get-all");
  getSetting = async (key: string): Promise<string | undefined> => {
    const result = await this.invoke("settings:get", key);
    return result === null ? undefined : result;
  };
  setSetting = (key: string, value: string) => this.invoke("settings:set", { key, value });

  // ── LLM & AI Services ────────────────────────────────────────────────────
  fetchProviderModels = (provider: string, apiKey?: string) =>
    this.invoke("llm:fetch-provider-models", { provider, apiKey });
  listProviders = () => this.invoke("llm:list-providers");
  configureProvider = (config: any) => this.invoke("llm:configure-provider", config);
  setActiveLLMProvider = (id: string) => this.invoke("llm:set-active-provider", id);
  testProviderConnection = (config: any) => this.invoke("llm:test-connection", config);
  parseResume = (resumeText: string) => this.invoke("llm:parse-resume", resumeText);
  scoreJob = (profileSummary: string, jobDescription: string) =>
    this.invoke("llm:score-job", { profileSummary, jobDescription });
  generateCoverLetter = (profileSummary: string, jobDescription: string) =>
    this.invoke("llm:generate-cover-letter", { profileSummary, jobDescription });
  answerQuestion = (profileSummary: string, question: string, context?: string) =>
    this.invoke("llm:answer-question", { profileSummary, question, context });
  tailorResume = (profileSummary: string, jobDescription: string) =>
    this.invoke("llm:tailor-resume", { profileSummary, jobDescription });

  // ── Resume File Picker ───────────────────────────────────────────────────
  pickAndExtractResume = () => this.invoke("resume:pick-and-extract");
  storeResumeFile = (profileId: string, sourcePath: string) =>
    this.invoke("resume:store-file", { profileId, sourcePath });

  // ── App Lifecycle & Updater ──────────────────────────────────────────────
  getAppVersion = () => this.invoke("app:get-version");
  checkForUpdates = () => this.invoke("app:check-updates");
}
