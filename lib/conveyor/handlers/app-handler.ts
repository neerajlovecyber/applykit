import { ipcMain } from "electron";
import * as dbQueries from "@/lib/main/db-queries";

export function registerAppHandlers(): void {
  // Profiles
  ipcMain.handle("profiles:get", () => dbQueries.getProfiles());
  ipcMain.handle("profiles:get-active", () => dbQueries.getActiveProfile());
  ipcMain.handle("profiles:create", (_, data) => dbQueries.createProfile(data));
  ipcMain.handle("profiles:update", (_, { id, data }) => dbQueries.updateProfile(id, data));
  ipcMain.handle("profiles:set-active", (_, id) => dbQueries.setActiveProfile(id));
  ipcMain.handle("profiles:delete", (_, id) => dbQueries.deleteProfile(id));

  // Jobs
  ipcMain.handle("jobs:get", (_, status) => dbQueries.getJobs(status));
  ipcMain.handle("jobs:add", (_, data) => dbQueries.addJob(data));
  ipcMain.handle("jobs:update-status", (_, { id, status, errorMessage }) => dbQueries.updateJobStatus(id, status, errorMessage));
  ipcMain.handle("jobs:remove", (_, id) => dbQueries.removeJob(id));
  ipcMain.handle("jobs:clear-completed", () => dbQueries.clearCompletedJobs());
  ipcMain.handle("jobs:get-stats", () => dbQueries.getQueueStats());

  // History
  ipcMain.handle("history:get", (_, filters) => dbQueries.getHistory(filters));
  ipcMain.handle("history:add", (_, data) => dbQueries.addHistoryEntry(data));
  ipcMain.handle("history:get-stats", () => dbQueries.getHistoryStats());

  // Platforms
  ipcMain.handle("platforms:get", () => dbQueries.getPlatforms());
  ipcMain.handle("platforms:update-status", (_, { id, status, cookies }) => dbQueries.updatePlatformStatus(id, status, cookies));

  // Settings
  ipcMain.handle("settings:get-all", () => dbQueries.getAllSettings());
  ipcMain.handle("settings:get", (_, key) => dbQueries.getSetting(key));
  ipcMain.handle("settings:set", (_, { key, value }) => dbQueries.setSetting(key, value));
}
