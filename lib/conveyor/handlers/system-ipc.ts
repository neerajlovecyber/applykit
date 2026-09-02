/**
 * System IPC Domain Dispatcher.
 *
 * Consolidates Settings, Platform Connections, LLM/AI services, and App updates.
 */

import { app } from "electron";
import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";
import { registerPlatformHandlers } from "./platform-handler";
import { registerLLMHandlers } from "./llm-handler";

export function registerSystemIpc(): void {
  // ── Settings ─────────────────────────────────────────────────────────────
  handle("settings:get-all", () => dbQueries.getAllSettings());
  handle("settings:get", (key) => dbQueries.getSetting(key));
  handle("settings:set", ({ key, value }) => dbQueries.setSetting(key, value));

  // ── App Updates & Version ────────────────────────────────────────────────
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

  // ── Platform & LLM Subsystems ────────────────────────────────────────────
  registerPlatformHandlers();
  registerLLMHandlers();
}
