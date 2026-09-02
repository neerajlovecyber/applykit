/**
 * Task IPC Domain Dispatcher.
 *
 * Consolidates IPC channels for Tasks Queue and Automation Plans.
 */

import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/db";
import { enqueueTask } from "@/lib/engine/task-queue";

export function registerTaskIpc(): void {
  // ── Tasks ────────────────────────────────────────────────────────────────
  handle("tasks:get", (status) => dbQueries.getTasks(status as any));
  handle("tasks:get-by-id", (id) => dbQueries.getTaskById(id));
  handle("tasks:create", (data) => dbQueries.createTask(data as any));
  handle("tasks:enqueue", (data) => enqueueTask(data as any));
  handle("tasks:update-status", (payload) =>
    dbQueries.updateTaskStatus(
      payload.id,
      payload.status as any,
      payload.resultData || payload.result,
      payload.errorMessage || payload.error,
    ),
  );
  handle("tasks:get-stats", () => dbQueries.getTaskStats());

  // ── Automation Plans ─────────────────────────────────────────────────────
  handle("automation-plans:get", (profileId) => dbQueries.getAutomationPlans(profileId));
  handle("automation-plans:get-by-id", (id) => dbQueries.getAutomationPlanById(id));
  handle("automation-plans:create", (data) => dbQueries.createAutomationPlan(data as any));
  handle("automation-plans:update", ({ id, data }) =>
    dbQueries.updateAutomationPlan(id, data as any),
  );
  handle("automation-plans:record-run", ({ id, appliedCount }) =>
    dbQueries.recordAutomationRun(id, appliedCount),
  );
  handle("automation-plans:delete", (id) => dbQueries.deleteAutomationPlan(id));
}
