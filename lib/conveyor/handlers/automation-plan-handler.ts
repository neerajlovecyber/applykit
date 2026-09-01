import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";

export function registerAutomationPlanHandlers(): void {
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
