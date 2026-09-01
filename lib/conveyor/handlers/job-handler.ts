import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";

export function registerJobHandlers(): void {
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
}
