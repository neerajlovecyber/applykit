import type { ElectronAPI } from "@electron-toolkit/preload";
import type {
  Profile, JobPosting, Application, QABankEntry,
  SearchQuery, Task, Platform, Document, AutomationPlan,
  Job, HistoryEntry,
} from "@/lib/main/db-queries";

export class DataApi {
  constructor(private readonly api: ElectronAPI) {}

  // ═══════════════════════════════════════════════════════════
  // PROFILES
  // ═══════════════════════════════════════════════════════════

  getProfiles = async (): Promise<Profile[]> => {
    return this.api.ipcRenderer.invoke("profiles:get");
  };
  getActiveProfile = async (): Promise<Profile | undefined> => {
    return this.api.ipcRenderer.invoke("profiles:get-active");
  };
  getProfileById = async (id: string): Promise<Profile | undefined> => {
    return this.api.ipcRenderer.invoke("profiles:get-by-id", id);
  };
  createProfile = async (data: Partial<Profile>): Promise<Profile> => {
    return this.api.ipcRenderer.invoke("profiles:create", data);
  };
  updateProfile = async (id: string, data: Partial<Profile>): Promise<Profile | undefined> => {
    return this.api.ipcRenderer.invoke("profiles:update", { id, data });
  };
  setActiveProfile = async (id: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("profiles:set-active", id);
  };
  deleteProfile = async (id: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("profiles:delete", id);
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
    return this.api.ipcRenderer.invoke("job-postings:get", filters);
  };
  getJobPostingById = async (id: string): Promise<JobPosting | undefined> => {
    return this.api.ipcRenderer.invoke("job-postings:get-by-id", id);
  };
  getJobPostingBySource = async (source: string, sourceId: string): Promise<JobPosting | undefined> => {
    return this.api.ipcRenderer.invoke("job-postings:get-by-source", { source, sourceId });
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
    return this.api.ipcRenderer.invoke("job-postings:upsert", data);
  };
  updateJobPostingState = async (id: string, state: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("job-postings:update-state", { id, state });
  };
  updateJobPostingScore = async (id: string, score: number, breakdown?: string, explanation?: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("job-postings:update-score", { id, score, breakdown, explanation });
  };
  getJobPostingStats = async (): Promise<{
    total: number;
    new: number;
    scored: number;
    queued: number;
    applied: number;
    skipped: number;
  }> => {
    return this.api.ipcRenderer.invoke("job-postings:get-stats");
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
    return this.api.ipcRenderer.invoke("applications:get", filters);
  };
  getApplicationsWithJobs = async (profileId?: string): Promise<(Application & {
    title: string;
    company: string;
    location: string | null;
    platform: string;
    application_url: string | null;
  })[]> => {
    return this.api.ipcRenderer.invoke("applications:get-with-jobs", profileId);
  };
  clearApplicationHistory = async (profileId?: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("applications:clear-history", profileId);
  };
  getApplicationById = async (id: string): Promise<Application | undefined> => {
    return this.api.ipcRenderer.invoke("applications:get-by-id", id);
  };
  getApplicationByJobId = async (jobId: string): Promise<Application | undefined> => {
    return this.api.ipcRenderer.invoke("applications:get-by-job", jobId);
  };
  createApplication = async (data: {
    job_id: string;
    profile_id: string;
    status?: string;
    resume_version?: string;
    cover_letter?: string;
  }): Promise<Application> => {
    return this.api.ipcRenderer.invoke("applications:create", data);
  };
  updateApplicationStatus = async (id: string, status: string, reason?: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("applications:update-status", { id, status, reason });
  };
  updateApplicationOutcome = async (id: string, outcome: string, note?: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("applications:update-outcome", { id, outcome, note });
  };
  updateApplicationMaterials = async (id: string, data: {
    resume_version?: string;
    cover_letter?: string;
    qa_responses?: string;
  }): Promise<void> => {
    return this.api.ipcRenderer.invoke("applications:update-materials", { id, data });
  };
  updateApplicationFillDetails = async (id: string, data: {
    fields_filled: number;
    fields_total: number;
    fill_details?: string;
    screenshot_path?: string;
  }): Promise<void> => {
    return this.api.ipcRenderer.invoke("applications:update-fill-details", { id, data });
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
    return this.api.ipcRenderer.invoke("applications:get-stats");
  };

  // ═══════════════════════════════════════════════════════════
  // QA BANK
  // ═══════════════════════════════════════════════════════════

  getQABankEntries = async (profileId: string): Promise<QABankEntry[]> => {
    return this.api.ipcRenderer.invoke("qa-bank:get", profileId);
  };
  findQAAnswer = async (profileId: string, questionPattern: string): Promise<QABankEntry | undefined> => {
    return this.api.ipcRenderer.invoke("qa-bank:find-answer", { profileId, questionPattern });
  };
  upsertQABankEntry = async (data: {
    profile_id: string;
    question_pattern: string;
    answer: string;
    question_type?: string;
    confidence?: string;
    source?: string;
  }): Promise<QABankEntry> => {
    return this.api.ipcRenderer.invoke("qa-bank:upsert", data);
  };
  incrementQAUsage = async (id: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("qa-bank:increment-usage", id);
  };
  deleteQABankEntry = async (id: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("qa-bank:delete", id);
  };
  seedDefaultQABank = async (profileId: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("qa-bank:seed", profileId);
  };

  // ═══════════════════════════════════════════════════════════
  // SEARCH QUERIES
  // ═══════════════════════════════════════════════════════════

  getSearchQueries = async (profileId?: string): Promise<SearchQuery[]> => {
    return this.api.ipcRenderer.invoke("search-queries:get", profileId);
  };
  getSearchQueryById = async (id: string): Promise<SearchQuery | undefined> => {
    return this.api.ipcRenderer.invoke("search-queries:get-by-id", id);
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
    return this.api.ipcRenderer.invoke("search-queries:create", data);
  };
  updateSearchQueryStatus = async (id: string, status: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("search-queries:update-status", { id, status });
  };
  deleteSearchQuery = async (id: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("search-queries:delete", id);
  };

  // ═══════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════

  getTasks = async (filters?: {
    status?: string;
    kind?: string;
    limit?: number;
  }): Promise<Task[]> => {
    return this.api.ipcRenderer.invoke("tasks:get", filters);
  };
  getTaskById = async (id: string): Promise<Task | undefined> => {
    return this.api.ipcRenderer.invoke("tasks:get-by-id", id);
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
    return this.api.ipcRenderer.invoke("tasks:create", data);
  };
  updateTaskStatus = async (id: string, status: string, result?: string, error?: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("tasks:update-status", { id, status, result, error });
  };
  getTaskStats = async (): Promise<{
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
  }> => {
    return this.api.ipcRenderer.invoke("tasks:get-stats");
  };

  // ═══════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════

  getDocuments = async (profileId: string, docType?: string): Promise<Document[]> => {
    return this.api.ipcRenderer.invoke("documents:get", { profileId, docType });
  };
  getDocumentById = async (id: string): Promise<Document | undefined> => {
    return this.api.ipcRenderer.invoke("documents:get-by-id", id);
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
    return this.api.ipcRenderer.invoke("documents:create", data);
  };
  deleteDocument = async (id: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("documents:delete", id);
  };

  // ═══════════════════════════════════════════════════════════
  // AUTOMATION PLANS
  // ═══════════════════════════════════════════════════════════

  getAutomationPlans = async (profileId?: string): Promise<AutomationPlan[]> => {
    return this.api.ipcRenderer.invoke("automation-plans:get", profileId);
  };
  getAutomationPlanById = async (id: string): Promise<AutomationPlan | undefined> => {
    return this.api.ipcRenderer.invoke("automation-plans:get-by-id", id);
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
    return this.api.ipcRenderer.invoke("automation-plans:create", data);
  };
  updateAutomationPlan = async (id: string, data: Partial<AutomationPlan>): Promise<AutomationPlan | undefined> => {
    return this.api.ipcRenderer.invoke("automation-plans:update", { id, data });
  };
  deleteAutomationPlan = async (id: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("automation-plans:delete", id);
  };

  // ═══════════════════════════════════════════════════════════
  // PLATFORMS
  // ═══════════════════════════════════════════════════════════

  getPlatforms = async (): Promise<Platform[]> => {
    return this.api.ipcRenderer.invoke("platforms:get");
  };
  getPlatformById = async (id: string): Promise<Platform | undefined> => {
    return this.api.ipcRenderer.invoke("platforms:get-by-id", id);
  };
  updatePlatformStatus = async (id: string, status: string, cookies?: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("platforms:update-status", { id, status, cookies });
  };
  updatePlatformAuthToken = async (id: string, authToken: string, status: string = "connected"): Promise<void> => {
    return this.api.ipcRenderer.invoke("platforms:update-auth-token", { id, authToken, status });
  };
  loginNaukri = async (credentials: { username: string; password?: string }): Promise<{ success: boolean; authToken?: string; errorMessage?: string }> => {
    return this.api.ipcRenderer.invoke("platforms:login-naukri", credentials);
  };
  updatePlatformDailyCount = async (id: string, count: number): Promise<void> => {
    return this.api.ipcRenderer.invoke("platforms:update-daily-count", { id, count });
  };
  resetPlatformDailyCounts = async (): Promise<void> => {
    return this.api.ipcRenderer.invoke("platforms:reset-daily-counts");
  };
  // ── Naukri connect-first flow ────────────────────────────────────────────

  /** Check if Naukri is connected (fast, no browser). */
  isNaukriConnected = async (): Promise<{ connected: boolean }> => {
    return this.api.ipcRenderer.invoke("naukri:is-connected");
  };

  /** Open Playwright Chromium → user logs in → auto-detected → marked connected. */
  connectNaukri = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    return this.api.ipcRenderer.invoke("naukri:connect");
  };

  /** Mark Naukri as disconnected. */
  disconnectNaukri = async (): Promise<{ success: boolean }> => {
    return this.api.ipcRenderer.invoke("naukri:disconnect");
  };

  /** Run Naukri auto-apply batch. */
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
    return this.api.ipcRenderer.invoke("naukri:auto-apply", options);
  };

  launchNaukriBrowser = async (): Promise<any> => {
    return this.api.ipcRenderer.invoke("naukri:launch-browser");
  };

  // ── LinkedIn connect-first flow ──────────────────────────────────────────

  /** Check if LinkedIn is connected (fast, no browser). */
  isLinkedInConnected = async (): Promise<{ connected: boolean }> => {
    return this.api.ipcRenderer.invoke("linkedin:is-connected");
  };

  /**
   * Open Playwright Chromium → user logs in → auto-detected → marked connected.
   * Long-running — awaiting this call shows a loading UI.
   */
  connectLinkedIn = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    return this.api.ipcRenderer.invoke("linkedin:connect");
  };

  /** Mark LinkedIn as disconnected (clears status, not cookies). */
  disconnectLinkedIn = async (): Promise<{ success: boolean }> => {
    return this.api.ipcRenderer.invoke("linkedin:disconnect");
  };

  /** Run the LinkedIn auto-apply batch. Must be connected first. */
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
    return this.api.ipcRenderer.invoke("linkedin:auto-apply", options);
  };

  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════

  getAllSettings = async (): Promise<Record<string, string>> => {
    return this.api.ipcRenderer.invoke("settings:get-all");
  };
  getSetting = async (key: string): Promise<string | undefined> => {
    return this.api.ipcRenderer.invoke("settings:get", key);
  };
  setSetting = async (key: string, value: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("settings:set", { key, value });
  };

  // ═══════════════════════════════════════════════════════════
  // LLM & MODEL DISCOVERY
  // ═══════════════════════════════════════════════════════════

  fetchProviderModels = async (provider: string, apiKey?: string): Promise<any[]> => {
    return this.api.ipcRenderer.invoke("llm:fetch-provider-models", { provider, apiKey });
  };
  listProviders = async (): Promise<any[]> => {
    return this.api.ipcRenderer.invoke("llm:list-providers");
  };
  configureProvider = async (config: any): Promise<void> => {
    return this.api.ipcRenderer.invoke("llm:configure-provider", config);
  };
  setActiveLLMProvider = async (id: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("llm:set-active-provider", id);
  };
  testProviderConnection = async (config: any): Promise<any> => {
    return this.api.ipcRenderer.invoke("llm:test-connection", config);
  };
  parseResume = async (resumeText: string): Promise<any> => {
    return this.api.ipcRenderer.invoke("llm:parse-resume", resumeText);
  };
  scoreJob = async (profileSummary: string, jobDescription: string): Promise<any> => {
    return this.api.ipcRenderer.invoke("llm:score-job", { profileSummary, jobDescription });
  };
  generateCoverLetter = async (profileSummary: string, jobDescription: string): Promise<string> => {
    return this.api.ipcRenderer.invoke("llm:generate-cover-letter", { profileSummary, jobDescription });
  };
  answerQuestion = async (profileSummary: string, question: string, context?: string): Promise<string> => {
    return this.api.ipcRenderer.invoke("llm:answer-question", { profileSummary, question, context });
  };
  tailorResume = async (profileSummary: string, jobDescription: string): Promise<string> => {
    return this.api.ipcRenderer.invoke("llm:tailor-resume", { profileSummary, jobDescription });
  };

  // ═══════════════════════════════════════════════════════════
  // LEGACY: Jobs & History
  // ═══════════════════════════════════════════════════════════

  getJobs = async (status?: string): Promise<Job[]> => {
    return this.api.ipcRenderer.invoke("jobs:get", status);
  };
  addJob = async (data: { title: string; company?: string; url: string; platform?: string; profile_id?: string }): Promise<Job> => {
    return this.api.ipcRenderer.invoke("jobs:add", data);
  };
  updateJobStatus = async (id: string, status: string, errorMessage?: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("jobs:update-status", { id, status, errorMessage });
  };
  removeJob = async (id: string): Promise<void> => {
    return this.api.ipcRenderer.invoke("jobs:remove", id);
  };
  clearCompletedJobs = async (): Promise<number> => {
    return this.api.ipcRenderer.invoke("jobs:clear-completed");
  };
  getQueueStats = async (): Promise<{ pending: number; running: number; done: number; failed: number; total: number }> => {
    return this.api.ipcRenderer.invoke("jobs:get-stats");
  };
  getHistory = async (filters?: { status?: string; platform?: string; limit?: number }): Promise<HistoryEntry[]> => {
    return this.api.ipcRenderer.invoke("history:get", filters);
  };
  addHistoryEntry = async (data: Omit<HistoryEntry, "id" | "applied_at">): Promise<HistoryEntry> => {
    return this.api.ipcRenderer.invoke("history:add", data);
  };
  getHistoryStats = async (): Promise<{ total: number; applied: number; failed: number; todayCount: number; weekCount: number }> => {
    return this.api.ipcRenderer.invoke("history:get-stats");
  };
}
