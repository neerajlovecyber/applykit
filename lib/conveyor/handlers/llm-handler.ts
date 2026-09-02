import { app, dialog } from "electron";
import * as fs from "fs";
import * as path from "path";
import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/db";
import * as llmRegistry from "@/lib/providers/provider-registry";
import { fetchOpenRouterModels, fetchProviderModels } from "@/lib/providers/model-fetcher";

export function registerLLMHandlers(): void {
  handle("llm:list-providers", () => llmRegistry.listProviders());
  handle("llm:set-active-provider", (id) => llmRegistry.setActiveProvider(id));
  handle("llm:configure-provider", (config) => llmRegistry.configureProvider(config as any));
  handle("llm:test-connection", (config) => llmRegistry.testProviderConnection(config as any));
  handle("llm:fetch-openrouter-models", () => fetchOpenRouterModels());
  handle("llm:fetch-provider-models", ({ provider, apiKey }) => {
    let keyToUse = apiKey;
    if (!keyToUse || keyToUse.startsWith("***")) {
      const savedConfig = llmRegistry.getProviderConfig(provider);
      keyToUse = savedConfig?.apiKey || "";
    }
    return fetchProviderModels(provider as any, keyToUse);
  });
  handle("llm:score-job", ({ profileSummary, jobDescription }) =>
    llmRegistry.scoreJobFit(profileSummary, jobDescription),
  );
  handle("llm:generate-cover-letter", ({ profileSummary, jobDescription }) =>
    llmRegistry.generateCoverLetter(profileSummary, jobDescription),
  );
  handle("llm:answer-question", ({ profileSummary, question, context }) =>
    llmRegistry.answerQuestion(profileSummary, question, context),
  );
  handle("llm:parse-resume", (resumeText) => llmRegistry.parseResume(resumeText));
  handle("llm:tailor-resume", ({ profileSummary, jobDescription }) =>
    llmRegistry.tailorResume(profileSummary, jobDescription),
  );

  handle("resume:pick-and-extract", async () => {
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
    console.log(`[Resume] Selected file: ${fileName} (${fileSizeKB} KB)`);

    const extractedText = await llmRegistry.extractPdfText(filePath);
    console.log(`[Resume] Extracted ${extractedText.length} characters from PDF`);

    return { canceled: false, filePath, fileName, fileSizeKB, extractedText };
  });

  handle("resume:store-file", async ({ profileId, sourcePath }) => {
    const destDir = path.join(app.getPath("userData"), "resumes");
    fs.mkdirSync(destDir, { recursive: true });
    const ext = path.extname(sourcePath) || ".pdf";
    const destPath = path.join(destDir, `${profileId}${ext}`);
    fs.copyFileSync(sourcePath, destPath);
    dbQueries.updateProfile(profileId, { resume_path: destPath });
    console.log(`[Resume] Stored base resume: ${destPath}`);
    return destPath;
  });
}
