import { app } from "electron";
import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";

export function registerLegacyHandlers(): void {
  handle("jobs:get", (status) => dbQueries.getJobs(status));
  handle("jobs:add", (data) => dbQueries.addJob(data as any));
  handle("jobs:update-status", ({ id, status, errorMessage }) =>
    dbQueries.updateJobStatus(id, status, errorMessage),
  );
  handle("jobs:remove", (id) => dbQueries.removeJob(id));
  handle("jobs:clear-completed", () => dbQueries.clearCompletedJobs());
  handle("jobs:get-stats", () => dbQueries.getQueueStats());

  handle("history:get", (filters) => dbQueries.getHistory(filters));
  handle("history:add", (data) => dbQueries.addHistoryEntry(data as any));
  handle("history:get-stats", () => dbQueries.getHistoryStats());

  handle("app:get-version", () => app.getVersion());
  handle("app:check-updates", async () => {
    if (!app.isPackaged) {
      return {
        isPackaged: false,
        version: app.getVersion(),
        message: "Development mode — auto-updates active in packaged build.",
      };
    }
    try {
      const { autoUpdater } = await import("electron-updater");
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: app.getVersion(), updateInfo: result?.updateInfo };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
