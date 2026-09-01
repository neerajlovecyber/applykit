import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";

export function registerApplicationHandlers(): void {
  handle("applications:get", (param) => {
    if (typeof param === "string") {
      return dbQueries.getApplications({ profileId: param });
    }
    return dbQueries.getApplications(param as any);
  });
  handle("applications:get-by-id", (id) => dbQueries.getApplicationById(id));
  handle("applications:get-by-job", (jobId) => dbQueries.getApplicationByJobId(jobId));
  handle("applications:create", (data) => dbQueries.createApplication(data as any));
  handle("applications:update-status", ({ id, status, errorMessage }) =>
    dbQueries.updateApplicationStatus(id, status as any, errorMessage),
  );
  handle("applications:update-outcome", ({ id, outcome, note }) =>
    dbQueries.updateApplicationOutcome(id, outcome as any, note),
  );
  handle("applications:update-materials", ({ id, data }) =>
    dbQueries.updateApplicationMaterials(id, data as any),
  );
  handle("applications:update-fill-details", ({ id, data }) =>
    dbQueries.updateApplicationFillDetails(id, data as any),
  );
  handle("applications:get-with-jobs", (profileId) =>
    dbQueries.getApplicationsWithJobs(profileId),
  );
  handle("applications:clear-history", (profileId) =>
    dbQueries.clearApplicationHistory(profileId),
  );
  handle("applications:get-stats", () => dbQueries.getApplicationStats());
}
