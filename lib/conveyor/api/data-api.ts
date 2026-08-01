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

  async getProfiles(): Promise<Profile[]> {
    return this.api.ipcRenderer.invoke("profiles:get");
  }
  async getActiveProfile(): Promise<Profile | undefined> {
    return this.api.ipcRenderer.invoke("profiles:get-active");
  }
  async getProfileById(id: string): Promise<Profile | undefined> {
    return this.api.ipcRenderer.invoke("profiles:get-by-id", id);
  }
  async createProfile(data: Partial<Profile>): Promise<Profile> {
    return this.api.ipcRenderer.invoke("profiles:create", data);
  }
  async updateProfile(id: string, data: Partial<Profile>): Promise<Profile | undefined> {
    return this.api.ipcRenderer.invoke("profiles:update", { id, data });
  }
  async setActiveProfile(id: string): Promise<void> {
    return this.api.ipcRenderer.invoke("profiles:set-active", id);
  }
  async deleteProfile(id: string): Promise<void> {
    return this.api.ipcRenderer.invoke("profiles:delete", id);
  }

  // ═══════════════════════════════════════════════════════════
  // JOB POSTINGS
  // ═══════════════════════════════════════════════════════════

  async getJobPostings(filters?: {
    state?: string;
    source?: string;
    minScore?: number;
    limit?: number;
    offset?: number;
  }): Promise<JobPosting[]> {
    return this.api.ipcRenderer.invoke("job-postings:get", filters);
  }
  async getJobPostingById(id: string): Promise<JobPosting | undefined> {
    return this.api.ipcRenderer.invoke("job-postings:get-by-id", id);
  }
  async getJobPostingBySource(source: string, sourceId: string): Promise<JobPosting | undefined> {
    return this.api.ipcRenderer.invoke("job-postings:get-by-source", { source, sourceId });
  }
  async upsertJobPosting(data: {
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
  }): Promise<JobPosting> {
    return this.api.ipcRenderer.invoke("job-postings:upsert", data);
  }
  async updateJobPostingState(id: string, state: string): Promise<void> {
    return this.api.ipcRenderer.invoke("job-postings:update-state", { id, state });
  }
  async updateJobPostingScore(id: string, score: number, breakdown?: string, explanation?: string): Promise<void> {
    return this.api.ipcRenderer.invoke("job-postings:update-score", { id, score, breakdown, explanation });
  }
  async getJobPostingStats(): Promise<{
    total: number;
    new: number;
    scored: number;
    queued: number;
    applied: number;
    skipped: number;
  }> {
    return this.api.ipcRenderer.invoke("job-postings:get-stats");
  }

  // ═══════════════════════════════════════════════════════════
  // APPLICATIONS
  // ═══════════════════════════════════════════════════════════

  async getApplications(filters?: {
    status?: string;
    outcome?: string;
    profileId?: string;
    limit?: number;
  }): Promise<Application[]> {
    return this.api.ipcRenderer.invoke("applications:get", filters);
  }
  async getApplicationById(id: string): Promise<Application | undefined> {
    return this.api.ipcRenderer.invoke("applications:get-by-id", id);
  }
  async getApplicationByJobId(jobId: string): Promise<Application | undefined> {
    return this.api.ipcRenderer.invoke("applications:get-by-job", jobId);
  }
  async createApplication(data: {
    job_id: string;
    profile_id: string;
    status?: string;
    resume_version?: string;
    cover_letter?: string;
  }): Promise<Application> {
    return this.api.ipcRenderer.invoke("applications:create", data);
  }
  async updateApplicationStatus(id: string, status: string, reason?: string): Promise<void> {
    return this.api.ipcRenderer.invoke("applications:update-status", { id, status, reason });
  }
  async updateApplicationOutcome(id: string, outcome: string, note?: string): Promise<void> {
    return this.api.ipcRenderer.invoke("applications:update-outcome", { id, outcome, note });
  }
  async updateApplicationMaterials(id: string, data: {
    resume_version?: string;
    cover_letter?: string;
    qa_responses?: string;
  }): Promise<void> {
    return this.api.ipcRenderer.invoke("applications:update-materials", { id, data });
  }
  async updateApplicationFillDetails(id: string, data: {
    fields_filled: number;
    fields_total: number;
    fill_details?: string;
    screenshot_path?: string;
  }): Promise<void> {
    return this.api.ipcRenderer.invoke("applications:update-fill-details", { id, data });
  }
  async getApplicationStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    submitted: number;
    failed: number;
    todayCount: number;
    weekCount: number;
  }> {
    return this.api.ipcRenderer.invoke("applications:get-stats");
  }

  // ═══════════════════════════════════════════════════════════
  // QA BANK
  // ═══════════════════════════════════════════════════════════

  async getQABankEntries(profileId: string): Promise<QABankEntry[]> {
    return this.api.ipcRenderer.invoke("qa-bank:get", profileId);
  }
  async findQAAnswer(profileId: string, questionPattern: string): Promise<QABankEntry | undefined> {
    return this.api.ipcRenderer.invoke("qa-bank:find-answer", { profileId, questionPattern });
  }
  async upsertQABankEntry(data: {
    profile_id: string;
    question_pattern: string;
    answer: string;
    question_type?: string;
    confidence?: string;
    source?: string;
  }): Promise<QABankEntry> {
    return this.api.ipcRenderer.invoke("qa-bank:upsert", data);
  }
  async incrementQAUsage(id: string): Promise<void> {
    return this.api.ipcRenderer.invoke("qa-bank:increment-usage", id);
  }
  async deleteQABankEntry(id: string): Promise<void> {
    return this.api.ipcRenderer.invoke("qa-bank:delete", id);
  }

  // ═══════════════════════════════════════════════════════════
  // SEARCH QUERIES
  // ═══════════════════════════════════════════════════════════

  async getSearchQueries(profileId?: string): Promise<SearchQuery[]> {
    return this.api.ipcRenderer.invoke("search-queries:get", profileId);
  }
  async getSearchQueryById(id: string): Promise<SearchQuery | undefined> {
    return this.api.ipcRenderer.invoke("search-queries:get-by-id", id);
  }
  async createSearchQuery(data: {
    profile_id: string;
    source: string;
    keywords: string;
    location?: string;
    filters?: string;
    max_pages?: number;
    run_interval_hours?: number;
  }): Promise<SearchQuery> {
    return this.api.ipcRenderer.invoke("search-queries:create", data);
  }
  async updateSearchQueryStatus(id: string, status: string): Promise<void> {
    return this.api.ipcRenderer.invoke("search-queries:update-status", { id, status });
  }
  async deleteSearchQuery(id: string): Promise<void> {
    return this.api.ipcRenderer.invoke("search-queries:delete", id);
  }

  // ═══════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════

  async getTasks(filters?: {
    status?: string;
    kind?: string;
    limit?: number;
  }): Promise<Task[]> {
    return this.api.ipcRenderer.invoke("tasks:get", filters);
  }
  async getTaskById(id: string): Promise<Task | undefined> {
    return this.api.ipcRenderer.invoke("tasks:get-by-id", id);
  }
  async createTask(data: {
    kind: string;
    payload?: string;
    job_id?: string;
    application_id?: string;
    parent_task_id?: string;
    scheduled_for?: string;
    max_attempts?: number;
  }): Promise<Task> {
    return this.api.ipcRenderer.invoke("tasks:create", data);
  }
  async updateTaskStatus(id: string, status: string, result?: string, error?: string): Promise<void> {
    return this.api.ipcRenderer.invoke("tasks:update-status", { id, status, result, error });
  }
  async getTaskStats(): Promise<{
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
  }> {
    return this.api.ipcRenderer.invoke("tasks:get-stats");
  }

  // ═══════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════

  async getDocuments(profileId: string, docType?: string): Promise<Document[]> {
    return this.api.ipcRenderer.invoke("documents:get", { profileId, docType });
  }
  async getDocumentById(id: string): Promise<Document | undefined> {
    return this.api.ipcRenderer.invoke("documents:get-by-id", id);
  }
  async createDocument(data: {
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
  }): Promise<Document> {
    return this.api.ipcRenderer.invoke("documents:create", data);
  }
  async deleteDocument(id: string): Promise<void> {
    return this.api.ipcRenderer.invoke("documents:delete", id);
  }

  // ═══════════════════════════════════════════════════════════
  // AUTOMATION PLANS
  // ═══════════════════════════════════════════════════════════

  async getAutomationPlans(profileId?: string): Promise<AutomationPlan[]> {
    return this.api.ipcRenderer.invoke("automation-plans:get", profileId);
  }
  async getAutomationPlanById(id: string): Promise<AutomationPlan | undefined> {
    return this.api.ipcRenderer.invoke("automation-plans:get-by-id", id);
  }
  async createAutomationPlan(data: {
    profile_id: string;
    name: string;
    steps: string;
    auto_apply?: number;
    min_match_score?: number;
    max_applies_per_run?: number;
    run_interval_hours?: number;
  }): Promise<AutomationPlan> {
    return this.api.ipcRenderer.invoke("automation-plans:create", data);
  }
  async updateAutomationPlan(id: string, data: Partial<AutomationPlan>): Promise<AutomationPlan | undefined> {
    return this.api.ipcRenderer.invoke("automation-plans:update", { id, data });
  }
  async deleteAutomationPlan(id: string): Promise<void> {
    return this.api.ipcRenderer.invoke("automation-plans:delete", id);
  }

  // ═══════════════════════════════════════════════════════════
  // PLATFORMS
  // ═══════════════════════════════════════════════════════════

  async getPlatforms(): Promise<Platform[]> {
    return this.api.ipcRenderer.invoke("platforms:get");
  }
  async getPlatformById(id: string): Promise<Platform | undefined> {
    return this.api.ipcRenderer.invoke("platforms:get-by-id", id);
  }
  async updatePlatformStatus(id: string, status: string, cookies?: string): Promise<void> {
    return this.api.ipcRenderer.invoke("platforms:update-status", { id, status, cookies });
  }
  async updatePlatformDailyCount(id: string, count: number): Promise<void> {
    return this.api.ipcRenderer.invoke("platforms:update-daily-count", { id, count });
  }
  async resetPlatformDailyCounts(): Promise<void> {
    return this.api.ipcRenderer.invoke("platforms:reset-daily-counts");
  }

  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════

  async getAllSettings(): Promise<Record<string, string>> {
    return this.api.ipcRenderer.invoke("settings:get-all");
  }
  async getSetting(key: string): Promise<string | undefined> {
    return this.api.ipcRenderer.invoke("settings:get", key);
  }
  async setSetting(key: string, value: string): Promise<void> {
    return this.api.ipcRenderer.invoke("settings:set", { key, value });
  }

  // ═══════════════════════════════════════════════════════════
  // LLM & MODEL DISCOVERY
  // ═══════════════════════════════════════════════════════════

  async fetchProviderModels(provider: string, apiKey?: string): Promise<any[]> {
    return this.api.ipcRenderer.invoke("llm:fetch-provider-models", { provider, apiKey });
  }
  async listProviders(): Promise<any[]> {
    return this.api.ipcRenderer.invoke("llm:list-providers");
  }
  async configureProvider(config: any): Promise<void> {
    return this.api.ipcRenderer.invoke("llm:configure-provider", config);
  }
  async setActiveLLMProvider(id: string): Promise<void> {
    return this.api.ipcRenderer.invoke("llm:set-active-provider", id);
  }
  async testProviderConnection(config: any): Promise<any> {
    return this.api.ipcRenderer.invoke("llm:test-connection", config);
  }

  // ═══════════════════════════════════════════════════════════
  // LEGACY: Jobs & History
  // ═══════════════════════════════════════════════════════════

  async getJobs(status?: string): Promise<Job[]> {
    return this.api.ipcRenderer.invoke("jobs:get", status);
  }
  async addJob(data: { title: string; company?: string; url: string; platform?: string; profile_id?: string }): Promise<Job> {
    return this.api.ipcRenderer.invoke("jobs:add", data);
  }
  async updateJobStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    return this.api.ipcRenderer.invoke("jobs:update-status", { id, status, errorMessage });
  }
  async removeJob(id: string): Promise<void> {
    return this.api.ipcRenderer.invoke("jobs:remove", id);
  }
  async clearCompletedJobs(): Promise<number> {
    return this.api.ipcRenderer.invoke("jobs:clear-completed");
  }
  async getQueueStats(): Promise<{ pending: number; running: number; done: number; failed: number; total: number }> {
    return this.api.ipcRenderer.invoke("jobs:get-stats");
  }
  async getHistory(filters?: { status?: string; platform?: string; limit?: number }): Promise<HistoryEntry[]> {
    return this.api.ipcRenderer.invoke("history:get", filters);
  }
  async addHistoryEntry(data: Omit<HistoryEntry, "id" | "applied_at">): Promise<HistoryEntry> {
    return this.api.ipcRenderer.invoke("history:add", data);
  }
  async getHistoryStats(): Promise<{ total: number; applied: number; failed: number; todayCount: number; weekCount: number }> {
    return this.api.ipcRenderer.invoke("history:get-stats");
  }
}
