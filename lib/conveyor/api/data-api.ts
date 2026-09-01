import type { ElectronAPI } from "@electron-toolkit/preload";
import { ConveyorApi } from "@/lib/preload/shared";
import type {
  Profile, JobPosting, Application, QABankEntry,
  SearchQuery, Task, Platform, Document, AutomationPlan,
  Job, HistoryEntry,
} from "@/lib/main/db-queries";

export class DataApi extends ConveyorApi {
  constructor(api: ElectronAPI) {
    super(api);
  }

  // ═══════════════════════════════════════════════════════════
  // PROFILES
  // ═══════════════════════════════════════════════════════════

  getProfiles = async (): Promise<Profile[]> => {
    return this.invoke("profiles:get");
  };
  getActiveProfile = async (): Promise<Profile | undefined> => {
    return this.invoke("profiles:get-active");
  };
  getProfileById = async (id: string): Promise<Profile | undefined> => {
    return this.invoke("profiles:get-by-id", id);
  };
  createProfile = async (data: Partial<Profile>): Promise<Profile> => {
    return this.invoke("profiles:create", data);
  };
  updateProfile = async (id: string, data: Partial<Profile>): Promise<Profile | undefined> => {
    return this.invoke("profiles:update", { id, data });
  };
  setActiveProfile = async (id: string): Promise<void> => {
    return this.invoke("profiles:set-active", id);
  };
  deleteProfile = async (id: string): Promise<void> => {
    return this.invoke("profiles:delete", id);
  };

  // ═══════════════════════════════════════════════════════════
  // JOB POSTINGS
  // ═══════════════════════════════════════════════════════════

  getJobPostings = async (filters?: {
    state?: string;
    source?: string;
    minScore?: number;
    limit?: number;
    offset?: number;
  }): Promise<JobPosting[]> => {
    return this.invoke("job-postings:get", filters);
  };
  getJobPostingById = async (id: string): Promise<JobPosting | undefined> => {
    return this.invoke("job-postings:get-by-id", id);
  };
  getJobPostingBySource = async (source: string, sourceId: string): Promise<JobPosting | undefined> => {
    return this.invoke("job-postings:get-by-source", { source, sourceId });
  };
  upsertJobPosting = async (data: {
    source: string;
    source_id: string;
    title: string;
    company: string;
    location?: string;
    employment_type?: string;
    seniority?: string;
    description?: string;
    requirements?: string;
    salary_info?: string;
    application_url?: string;
    company_url?: string;
    raw_data?: string;
    content_hash?: string;
  }): Promise<JobPosting> => {
    return this.invoke("job-postings:upsert", data);
  };
  updateJobPostingState = async (id: string, state: string): Promise<void> => {
    return this.invoke("job-postings:update-state", { id, state });
  };
  updateJobPostingScore = async (id: string, score: number, breakdown?: string, explanation?: string): Promise<void> => {
    return this.invoke("job-postings:update-score", { id, score, breakdown, explanation });
  };
  getJobPostingStats = async (): Promise<{
    total: number;
    new: number;
    scored: number;
    queued: number;
    applied: number;
    skipped: number;
  }> => {
    return this.invoke("job-postings:get-stats");
  };

  // ═══════════════════════════════════════════════════════════
  // APPLICATIONS
  // ═══════════════════════════════════════════════════════════

  getApplications = async (filters?: {
    status?: string;
    outcome?: string;
    profileId?: string;
    limit?: number;
  }): Promise<Application[]> => {
    return this.invoke("applications:get", filters?.profileId);
  };
  getApplicationsWithJobs = async (profileId?: string): Promise<(Application & {
    title: string;
    company: string;
    location: string | null;
    platform: string;
    application_url: string | null;
  })[]> => {
    return this.invoke("applications:get-with-jobs", profileId);
  };
  clearApplicationHistory = async (profileId?: string): Promise<void> => {
    return this.invoke("applications:clear-history", profileId);
  };
  getApplicationById = async (id: string): Promise<Application | undefined> => {
    return this.invoke("applications:get-by-id", id);
  };
  getApplicationByJobId = async (jobId: string): Promise<Application | undefined> => {
    return this.invoke("applications:get-by-job", jobId);
  };
  createApplication = async (data: {
    job_id: string;
    profile_id: string;
    status?: string;
    resume_version?: string;
    cover_letter?: string;
  }): Promise<Application> => {
    return this.invoke("applications:create", data);
  };
  updateApplicationStatus = async (id: string, status: string, reason?: string): Promise<void> => {
    return this.invoke("applications:update-status", { id, status, errorMessage: reason });
  };
  updateApplicationOutcome = async (id: string, outcome: string, note?: string): Promise<void> => {
    return this.invoke("applications:update-outcome", { id, outcome, note });
  };
  updateApplicationMaterials = async (id: string, data: {
    resume_version?: string;
    cover_letter?: string;
    qa_responses?: string;
  }): Promise<void> => {
    return this.invoke("applications:update-materials", { id, data });
  };
  updateApplicationFillDetails = async (id: string, data: {
    fields_filled: number;
    fields_total: number;
    fill_details?: string;
    screenshot_path?: string;
  }): Promise<void> => {
    return this.invoke("applications:update-fill-details", { id, data });
  };
  getApplicationStats = async (): Promise<{
    total: number;
    pending: number;
    approved: number;
    submitted: number;
    failed: number;
    todayCount: number;
    weekCount: number;
  }> => {
    return this.invoke("applications:get-stats");
  };

  // ═══════════════════════════════════════════════════════════
  // QA BANK
  // ═══════════════════════════════════════════════════════════

  getQABankEntries = async (profileId: string): Promise<QABankEntry[]> => {
    return this.invoke("qa-bank:get", profileId);
  };
  findQAAnswer = async (profileId: string, questionPattern: string): Promise<QABankEntry | undefined> => {
    return this.invoke("qa-bank:find-answer", { profileId, questionPattern });
  };
  upsertQABankEntry = async (data: {
    profile_id: string;
    question_pattern: string;
    answer: string;
    question_type?: string;
    confidence?: string;
    source?: string;
  }): Promise<QABankEntry> => {
    return this.invoke("qa-bank:upsert", data);
  };
  incrementQAUsage = async (id: string): Promise<void> => {
    return this.invoke("qa-bank:increment-usage", id);
  };
  deleteQABankEntry = async (id: string): Promise<void> => {
    return this.invoke("qa-bank:delete", id);
  };
  clearAIGeneratedQABankEntries = async (profileId: string): Promise<void> => {
    return this.invoke("qa-bank:clear-ai", profileId);
  };
  seedDefaultQABank = async (profileId: string): Promise<void> => {
    return this.invoke("qa-bank:seed", profileId);
  };

  // ═══════════════════════════════════════════════════════════
  // SEARCH QUERIES
  // ═══════════════════════════════════════════════════════════

  getSearchQueries = async (profileId?: string): Promise<SearchQuery[]> => {
    return this.invoke("search-queries:get", profileId);
  };
  getSearchQueryById = async (id: string): Promise<SearchQuery | undefined> => {
    return this.invoke("search-queries:get-by-id", id);
  };
  createSearchQuery = async (data: {
    profile_id: string;
    source: string;
    keywords: string;
    location?: string;
    filters?: string;
    max_pages?: number;
    run_interval_hours?: number;
  }): Promise<SearchQuery> => {
    return this.invoke("search-queries:create", data);
  };
  updateSearchQueryStatus = async (id: string, status: string): Promise<void> => {
    return this.invoke("search-queries:update-status", { id, status });
  };
  deleteSearchQuery = async (id: string): Promise<void> => {
    return this.invoke("search-queries:delete", id);
  };

  // ═══════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════

  getTasks = async (filters?: {
    status?: string;
    kind?: string;
    limit?: number;
  }): Promise<Task[]> => {
    return this.invoke("tasks:get", filters?.status);
  };
  getTaskById = async (id: string): Promise<Task | undefined> => {
    return this.invoke("tasks:get-by-id", id);
  };
  createTask = async (data: {
    kind: string;
    payload?: string;
    job_id?: string;
    application_id?: string;
    parent_task_id?: string;
    scheduled_for?: string;
    max_attempts?: number;
  }): Promise<Task> => {
    return this.invoke("tasks:create", data);
  };
  updateTaskStatus = async (id: string, status: string, result?: string, error?: string): Promise<void> => {
    return this.invoke("tasks:update-status", { id, status, result, error });
  };
  getTaskStats = async (): Promise<{
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
  }> => {
    return this.invoke("tasks:get-stats");
  };

  // ═══════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════

  getDocuments = async (profileId: string, _docType?: string): Promise<Document[]> => {
    return this.invoke("documents:get", profileId);
  };
  getDocumentById = async (id: string): Promise<Document | undefined> => {
    return this.invoke("documents:get-by-id", id);
  };
  createDocument = async (data: {
    profile_id: string;
    doc_type: string;
    display_name: string;
    file_path: string;
    file_format?: string;
    extracted_text?: string;
    parsed_structure?: string;
    checksum?: string;
    size_bytes?: number;
    origin?: string;
    source_job_id?: string;
    is_default?: number;
  }): Promise<Document> => {
    return this.invoke("documents:insert", data);
  };
  deleteDocument = async (id: string): Promise<void> => {
    return this.invoke("documents:delete", id);
  };

  // ═══════════════════════════════════════════════════════════
  // AUTOMATION PLANS
  // ═══════════════════════════════════════════════════════════

  getAutomationPlans = async (profileId?: string): Promise<AutomationPlan[]> => {
    return this.invoke("automation-plans:get", profileId);
  };
  getAutomationPlanById = async (id: string): Promise<AutomationPlan | undefined> => {
    return this.invoke("automation-plans:get-by-id", id);
  };
  createAutomationPlan = async (data: {
    profile_id: string;
    name: string;
    steps: string;
    auto_apply?: number;
    min_match_score?: number;
    max_applies_per_run?: number;
    run_interval_hours?: number;
  }): Promise<AutomationPlan> => {
    return this.invoke("automation-plans:create", data);
  };
  updateAutomationPlan = async (id: string, data: Partial<AutomationPlan>): Promise<AutomationPlan | undefined> => {
    return this.invoke("automation-plans:update", { id, data });
  };
  deleteAutomationPlan = async (id: string): Promise<void> => {
    return this.invoke("automation-plans:delete", id);
  };

  // ═══════════════════════════════════════════════════════════
  // PLATFORMS
  // ═══════════════════════════════════════════════════════════

  getPlatforms = async (): Promise<Platform[]> => {
    return this.invoke("platforms:get");
  };
  getPlatformById = async (id: string): Promise<Platform | undefined> => {
    return this.invoke("platforms:get-by-id", id);
  };
  updatePlatformStatus = async (id: string, status: string, cookies?: string): Promise<void> => {
    return this.invoke("platforms:update-status", { id, status, cookies });
  };
  updatePlatformAuthToken = async (id: string, authToken: string, status: string = "connected"): Promise<void> => {
    return this.invoke("platforms:update-auth-token", { id, authToken, status });
  };
  loginNaukri = async (credentials: { username: string; password?: string }): Promise<{ success: boolean; authToken?: string; errorMessage?: string }> => {
    return this.invoke("platforms:login-naukri", { username: credentials.username, password: credentials.password || "" });
  };
  updatePlatformDailyCount = async (id: string, count: number): Promise<void> => {
    return this.invoke("platforms:update-daily-count", { id, count });
  };
  resetPlatformDailyCounts = async (): Promise<void> => {
    return this.invoke("platforms:reset-daily-counts");
  };

  // ── Naukri connect-first flow ────────────────────────────────────────────

  isNaukriConnected = async (): Promise<{ connected: boolean }> => {
    return this.invoke("naukri:is-connected");
  };
  connectNaukri = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    return this.invoke("naukri:connect");
  };
  disconnectNaukri = async (): Promise<{ success: boolean }> => {
    return this.invoke("naukri:disconnect");
  };
  runNaukriAutoApply = async (options: {
    keywords: string;
    location?: string;
    maxJobs?: number;
    filters?: {
      datePosted?: "past24Hours" | "pastWeek" | "pastMonth" | "anyTime";
      experienceLevel?: string[];
      workMode?: string[];
      easyApplyOnly?: boolean;
    };
    pauseBeforeSubmit?: boolean;
    username?: string;
    password?: string;
  }): Promise<any> => {
    return this.invoke("naukri:auto-apply", options);
  };
  launchNaukriBrowser = async (): Promise<any> => {
    return this.invoke("naukri:launch-browser");
  };

  // ── LinkedIn connect-first flow ──────────────────────────────────────────

  isLinkedInConnected = async (): Promise<{ connected: boolean }> => {
    return this.invoke("linkedin:is-connected");
  };
  connectLinkedIn = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    return this.invoke("linkedin:connect");
  };
  disconnectLinkedIn = async (): Promise<{ success: boolean }> => {
    return this.invoke("linkedin:disconnect");
  };
  runLinkedInAutoApply = async (options: {
    keywords: string;
    location?: string;
    maxJobs?: number;
    filters?: {
      datePosted?: "past24Hours" | "pastWeek" | "pastMonth" | "anyTime";
      experienceLevel?: string[];
      jobType?: string[];
      workMode?: string[];
      easyApplyOnly?: boolean;
      under10Applicants?: boolean;
    };
    pauseBeforeSubmit?: boolean;
  }): Promise<any> => {
    return this.invoke("linkedin:auto-apply", options);
  };

  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════

  getAllSettings = async (): Promise<Record<string, string>> => {
    return this.invoke("settings:get-all");
  };
  getSetting = async (key: string): Promise<string | undefined> => {
    const result = await this.invoke("settings:get", key);
    return result === null ? undefined : result;
  };
  setSetting = async (key: string, value: string): Promise<void> => {
    return this.invoke("settings:set", { key, value });
  };

  // ═══════════════════════════════════════════════════════════
  // LLM & MODEL DISCOVERY
  // ═══════════════════════════════════════════════════════════

  fetchProviderModels = async (provider: string, apiKey?: string): Promise<any[]> => {
    return this.invoke("llm:fetch-provider-models", { provider, apiKey });
  };
  listProviders = async (): Promise<any[]> => {
    return this.invoke("llm:list-providers");
  };
  configureProvider = async (config: any): Promise<void> => {
    return this.invoke("llm:configure-provider", config);
  };
  setActiveLLMProvider = async (id: string): Promise<void> => {
    return this.invoke("llm:set-active-provider", id);
  };
  testProviderConnection = async (config: any): Promise<any> => {
    return this.invoke("llm:test-connection", config);
  };
  parseResume = async (resumeText: string): Promise<any> => {
    return this.invoke("llm:parse-resume", resumeText);
  };
  scoreJob = async (profileSummary: string, jobDescription: string): Promise<any> => {
    return this.invoke("llm:score-job", { profileSummary, jobDescription });
  };
  generateCoverLetter = async (profileSummary: string, jobDescription: string): Promise<string> => {
    return this.invoke("llm:generate-cover-letter", { profileSummary, jobDescription });
  };
  answerQuestion = async (profileSummary: string, question: string, context?: string): Promise<string> => {
    return this.invoke("llm:answer-question", { profileSummary, question, context });
  };
  tailorResume = async (profileSummary: string, jobDescription: string): Promise<string> => {
    return this.invoke("llm:tailor-resume", { profileSummary, jobDescription });
  };

  // ═══════════════════════════════════════════════════════════
  // RESUME FILE PICKER & STORAGE
  // ═══════════════════════════════════════════════════════════

  pickAndExtractResume = async (): Promise<{
    canceled: boolean;
    filePath?: string;
    fileName?: string;
    fileSizeKB?: number;
    extractedText?: string;
  }> => {
    return this.invoke("resume:pick-and-extract");
  };
  storeResumeFile = async (profileId: string, sourcePath: string): Promise<string> => {
    return this.invoke("resume:store-file", { profileId, sourcePath });
  };

  // ═══════════════════════════════════════════════════════════
  // LEGACY: Jobs & History
  // ═══════════════════════════════════════════════════════════

  getJobs = async (status?: string): Promise<Job[]> => {
    return this.invoke("jobs:get", status);
  };
  addJob = async (data: { title: string; company?: string; url: string; platform?: string; profile_id?: string }): Promise<Job> => {
    return this.invoke("jobs:add", data);
  };
  updateJobStatus = async (id: string, status: string, errorMessage?: string): Promise<void> => {
    return this.invoke("jobs:update-status", { id, status, errorMessage });
  };
  removeJob = async (id: string): Promise<void> => {
    return this.invoke("jobs:remove", id);
  };
  clearCompletedJobs = async (): Promise<number> => {
    return this.invoke("jobs:clear-completed");
  };
  getQueueStats = async (): Promise<{ pending: number; running: number; done: number; failed: number; total: number }> => {
    return this.invoke("jobs:get-stats");
  };
  getHistory = async (filters?: { status?: string; platform?: string; limit?: number }): Promise<HistoryEntry[]> => {
    return this.invoke("history:get", filters);
  };
  addHistoryEntry = async (data: Omit<HistoryEntry, "id" | "applied_at">): Promise<HistoryEntry> => {
    return this.invoke("history:add", data);
  };
  getHistoryStats = async (): Promise<{ total: number; applied: number; failed: number; todayCount: number; weekCount: number }> => {
    return this.invoke("history:get-stats");
  };

  // ═══════════════════════════════════════════════════════════
  // SYSTEM & AUTO-UPDATER
  // ═══════════════════════════════════════════════════════════

  getAppVersion = async (): Promise<string> => {
    return this.invoke("app:get-version");
  };
  checkForUpdates = async (): Promise<{ isPackaged?: boolean; success?: boolean; version?: string; updateInfo?: any; error?: string; message?: string }> => {
    return this.invoke("app:check-updates");
  };
}
