/**
 * Conveyor App Handlers Orchestrator (Candidate 4).
 *
 * Coordinates registration of the 4 consolidated domain IPC dispatchers:
 * - Profile IPC (Profiles, Documents, QA Bank)
 * - Job IPC (Job Postings, Applications, Search Queries)
 * - Task IPC (Tasks Queue, Automation Plans)
 * - System IPC (Settings, Platforms, LLM Services, Legacy Shims)
 *
 * All channels enforce runtime argument and return validation via Zod schemas.
 */

import { registerProfileIpc } from "./profile-ipc";
import { registerJobIpc } from "./job-ipc";
import { registerTaskIpc } from "./task-ipc";
import { registerSystemIpc } from "./system-ipc";

export function registerAppHandlers(_app?: any): void {
  registerProfileIpc();
  registerJobIpc();
  registerTaskIpc();
  registerSystemIpc();

  console.log("[Conveyor] All 4 consolidated domain IPC dispatchers registered with Zod validation.");
}

// Re-export domain dispatchers for granular access
export { registerProfileIpc, registerJobIpc, registerTaskIpc, registerSystemIpc };
