/**
 * Job IPC Domain Dispatcher.
 *
 * Consolidates IPC channels for Job Postings, Applications, and Search Queries.
 */

import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/db";
import { executeSearch } from "@/lib/jobs";

export function registerJobIpc(): void {
  // ── Job Postings ─────────────────────────────────────────────────────────
  handle("job-postings:get", (filters) => dbQueries.getJobPostings(filters));
  handle("job-postings:get-by-id", (id) => dbQueries.getJobPostingById(id));
  handle("job-postings:get-by-source", ({ source, sourceId }) =>
    dbQueries.getJobPostingBySourceId(source, sourceId),
  );
  handle("job-postings:upsert", (data) => dbQueries.upsertJobPosting(data as any));
  handle("job-postings:update-state", ({ id, state }) =>
    dbQueries.updateJobPostingState(id, state),
  );
  handle("job-postings:update-score", ({ id, score, breakdown, explanation }) =>
    dbQueries.updateJobPostingScore(id, score, breakdown, explanation),
  );
  handle("job-postings:get-stats", () => dbQueries.getJobPostingStats());

  // ── Applications ─────────────────────────────────────────────────────────
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

  // ── Search & Search Queries ──────────────────────────────────────────────
  handle("search:execute", ({ options, queryId }) => executeSearch(options as any, queryId));
  handle("search-queries:get", (profileId) => dbQueries.getSearchQueries(profileId));
  handle("search-queries:get-by-id", (id) => dbQueries.getSearchQueryById(id));
  handle("search-queries:create", (data) => dbQueries.createSearchQuery(data as any));
  handle("search-queries:update", ({ id, data }) => dbQueries.updateSearchQuery(id, data as any));
  handle("search-queries:update-status", ({ id, status }) =>
    dbQueries.updateSearchQueryStatus(id, status as any),
  );
  handle("search-queries:record-run", ({ id, foundCount }) =>
    dbQueries.recordSearchRun(id, foundCount),
  );
  handle("search-queries:delete", (id) => dbQueries.deleteSearchQuery(id));
}
