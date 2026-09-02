/**
 * System IPC Domain Dispatcher.
 *
 * Consolidates Settings, Platform Connections, LLM/AI services, and Legacy IPC channels.
 */

import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";
import { registerPlatformHandlers } from "./platform-handler";
import { registerLLMHandlers } from "./llm-handler";
import { registerLegacyHandlers } from "./legacy-handler";

export function registerSystemIpc(): void {
  // ── Settings ─────────────────────────────────────────────────────────────
  handle("settings:get-all", () => dbQueries.getAllSettings());
  handle("settings:get", (key) => dbQueries.getSetting(key));
  handle("settings:set", ({ key, value }) => dbQueries.setSetting(key, value));

  // ── Delegated Subsystems ─────────────────────────────────────────────────
  registerPlatformHandlers();
  registerLLMHandlers();
  registerLegacyHandlers();
}
