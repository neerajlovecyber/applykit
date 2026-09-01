import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";

export function registerDocumentHandlers(): void {
  handle("documents:get", (profileId) => dbQueries.getDocuments(profileId));
  handle("documents:get-by-id", (id) => dbQueries.getDocumentById(id));
  handle("documents:insert", (data) => dbQueries.insertDocument(data as any));
  handle("documents:delete", (id) => dbQueries.deleteDocument(id));
}
