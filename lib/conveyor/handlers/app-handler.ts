/**
 * Conveyor App Handlers Orchestrator
 *
 * Coordinates registration of all modular domain IPC handlers.
 * Each domain provides runtime argument and return-type validation
 * enforced via Zod schemas through the Conveyor `handle` wrapper.
 */

import { registerProfileHandlers } from "./profile-handler";
import { registerJobHandlers } from "./job-handler";
import { registerApplicationHandlers } from "./application-handler";
import { registerQAHandlers } from "./qa-handler";
import { registerPlatformHandlers } from "./platform-handler";
import { registerTaskHandlers } from "./task-handler";
import { registerSettingsHandlers } from "./settings-handler";
import { registerLLMHandlers } from "./llm-handler";
import { registerDocumentHandlers } from "./document-handler";
import { registerAutomationPlanHandlers } from "./automation-plan-handler";
import { registerLegacyHandlers } from "./legacy-handler";

export function registerAppHandlers(_app?: any): void {
  registerProfileHandlers();
  registerJobHandlers();
  registerApplicationHandlers();
  registerQAHandlers();
  registerPlatformHandlers();
  registerTaskHandlers();
  registerSettingsHandlers();
  registerLLMHandlers();
  registerDocumentHandlers();
  registerAutomationPlanHandlers();
  registerLegacyHandlers();

  console.log("[Conveyor] All domain IPC handlers registered with Zod validation.");
}
