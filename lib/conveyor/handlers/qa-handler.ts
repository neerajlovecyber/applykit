import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";

export function registerQAHandlers(): void {
  handle("qa-bank:get", (profileId) => (profileId ? dbQueries.getQABankEntries(profileId) : []));
  handle("qa-bank:find", ({ profileId, pattern }) =>
    dbQueries.findQAAnswer(profileId, pattern),
  );
  handle("qa-bank:find-answer", ({ profileId, questionPattern, pattern }) =>
    dbQueries.findQAAnswer(profileId, questionPattern || pattern || ""),
  );
  handle("qa-bank:increment-usage", (id) => dbQueries.incrementQAUsage(id));
  handle("qa-bank:upsert", (data) => dbQueries.upsertQABankEntry(data as any));
  handle("qa-bank:delete", (id) => dbQueries.deleteQABankEntry(id));
  handle("qa-bank:clear-ai", (profileId) =>
    profileId ? dbQueries.clearAIGeneratedQABankEntries(profileId) : undefined,
  );
  handle("qa-bank:seed", (profileId) =>
    profileId ? dbQueries.seedDefaultQABank(profileId) : undefined,
  );
}
