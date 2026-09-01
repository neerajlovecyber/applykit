import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";
import { executeSearch } from "@/lib/jobs/search/search-manager";

export function registerTaskHandlers(): void {
  handle("tasks:get", (status) => dbQueries.getTasks(status as any));
  handle("tasks:get-by-id", (id) => dbQueries.getTaskById(id));
  handle("tasks:create", (data) => dbQueries.createTask(data as any));
  handle("tasks:update-status", (payload) =>
    dbQueries.updateTaskStatus(
      payload.id,
      payload.status as any,
      payload.resultData || payload.result,
      payload.errorMessage || payload.error,
    ),
  );
  handle("tasks:get-stats", () => dbQueries.getTaskStats());

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
