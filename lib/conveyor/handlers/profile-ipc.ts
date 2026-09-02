/**
 * Profile IPC Domain Dispatcher.
 *
 * Consolidates IPC channels for Profiles, Documents, and QA Bank.
 */

import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/db";
import { documentIntakeService } from "@/lib/documents";

export function registerProfileIpc(): void {
  // ── Profiles ─────────────────────────────────────────────────────────────
  handle("profiles:get", () => dbQueries.getProfiles());
  handle("profiles:get-active", () => dbQueries.getActiveProfile());
  handle("profiles:get-by-id", (id) => dbQueries.getProfileById(id));
  handle("profiles:create", (data) => dbQueries.createProfile(data));
  handle("profiles:update", ({ id, data }) => dbQueries.updateProfile(id, data));
  handle("profiles:set-active", (id) => dbQueries.setActiveProfile(id));
  handle("profiles:delete", (id) => dbQueries.deleteProfile(id));

  // ── Documents ────────────────────────────────────────────────────────────
  handle("documents:get", (profileId) => dbQueries.getDocuments(profileId));
  handle("documents:get-by-id", (id) => dbQueries.getDocumentById(id));
  handle("documents:insert", (data) => dbQueries.insertDocument(data as any));
  handle("documents:delete", (id) => dbQueries.deleteDocument(id));
  handle("documents:intake", (options) => documentIntakeService.intakeResume(options as any));
  handle("documents:pick-file", async () => {
    try {
      const { dialog } = require("electron");
      const fs = require("fs");
      const path = require("path");
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Select Resume PDF",
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
        properties: ["openFile"],
      });
      if (canceled || !filePaths.length) return { canceled: true };

      const filePath = filePaths[0];
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const fileSizeKB = Math.round(stats.size / 1024);
      return { canceled: false, filePath, fileName, fileSizeKB };
    } catch (err) {
      return { canceled: true, error: (err as Error).message };
    }
  });

  // ── QA Bank ──────────────────────────────────────────────────────────────
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
