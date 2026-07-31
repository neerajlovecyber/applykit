import type { ElectronAPI } from "@electron-toolkit/preload";
import type { Profile, Job, HistoryEntry, Platform } from "@/lib/main/db-queries";

export class DataApi {
  constructor(private readonly api: ElectronAPI) {}

  // Profiles
  async getProfiles(): Promise<Profile[]> {
    return this.api.ipcRenderer.invoke("profiles:get");
  }
  async getActiveProfile(): Promise<Profile | undefined> {
    return this.api.ipcRenderer.invoke("profiles:get-active");
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

  // Jobs
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

  // History
  async getHistory(filters?: { status?: string; platform?: string; limit?: number }): Promise<HistoryEntry[]> {
    return this.api.ipcRenderer.invoke("history:get", filters);
  }
  async addHistoryEntry(data: Omit<HistoryEntry, "id" | "applied_at">): Promise<HistoryEntry> {
    return this.api.ipcRenderer.invoke("history:add", data);
  }
  async getHistoryStats(): Promise<{ total: number; applied: number; failed: number; todayCount: number; weekCount: number }> {
    return this.api.ipcRenderer.invoke("history:get-stats");
  }

  // Platforms
  async getPlatforms(): Promise<Platform[]> {
    return this.api.ipcRenderer.invoke("platforms:get");
  }
  async updatePlatformStatus(id: string, status: string, cookies?: string): Promise<void> {
    return this.api.ipcRenderer.invoke("platforms:update-status", { id, status, cookies });
  }

  // Settings
  async getAllSettings(): Promise<Record<string, string>> {
    return this.api.ipcRenderer.invoke("settings:get-all");
  }
  async getSetting(key: string): Promise<string | undefined> {
    return this.api.ipcRenderer.invoke("settings:get", key);
  }
  async setSetting(key: string, value: string): Promise<void> {
    return this.api.ipcRenderer.invoke("settings:set", { key, value });
  }
}
