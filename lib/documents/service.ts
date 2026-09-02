/**
 * Document Intake Service.
 *
 * Deep domain service coordinating resume ingestion, text extraction,
 * LLM parsing, canonical schema normalization, file archiving, and persistence.
 */

import * as fs from "fs";
import * as path from "path";
import { parseResume, extractPdfText } from "@/lib/providers/provider-registry";
import { normalizeResume } from "./parser";
import * as dbQueries from "@/lib/db";
import type { ResumeIntakeOptions, DocumentIntakeResult, NormalizedResume } from "./types";

export class DocumentIntakeService {
  constructor(
    private readonly options: {
      llmParser?: (text: string) => Promise<any>;
      pdfExtractor?: (input: string) => Promise<string>;
      storageDir?: string;
    } = {}
  ) {}

  /**
   * Ingest and normalize a candidate resume from either a file path or raw text string.
   */
  async intakeResume(options: ResumeIntakeOptions): Promise<DocumentIntakeResult> {
    const { filePath, profileId, profileTrackName } = options;
    let rawText = (options.rawText || "").trim();

    // 1. Extract text from PDF if rawText was not provided
    if (!rawText && filePath) {
      const extractor = this.options.pdfExtractor || extractPdfText;
      rawText = await extractor(filePath);
    }

    if (!rawText) {
      throw new Error("Cannot intake resume: No text extracted or provided.");
    }

    // 2. Invoke LLM Parser
    const parser = this.options.llmParser || parseResume;
    const rawParsed = await parser(rawText);

    // 3. Deep Canonical Normalization
    const parsedData: NormalizedResume = normalizeResume(rawParsed, rawText, filePath);

    let profile: any = undefined;
    let document: any = undefined;

    // 4. Persistence to SQLite if updating existing profile
    if (profileId) {
      dbQueries.updateProfile(profileId, {
        name: parsedData.fullName || undefined,
        full_name: parsedData.fullName || undefined,
        email: parsedData.email || undefined,
        phone: parsedData.phone || undefined,
        location: parsedData.location || undefined,
        skills: JSON.stringify(parsedData.skills),
        seniority: parsedData.seniority,
        experience_years: parsedData.experienceYears,
        summary: parsedData.summary,
        resume_parsed: JSON.stringify(parsedData),
      });
      profile = dbQueries.getProfileById(profileId);

      if (filePath && fs.existsSync(filePath)) {
        const storedPath = this.archiveResumeFile(filePath, profileId);
        if (storedPath) {
          dbQueries.updateProfile(profileId, { resume_path: storedPath });
          document = dbQueries.insertDocument({
            profile_id: profileId,
            name: path.basename(filePath),
            type: "resume",
            file_path: storedPath,
            content_text: rawText,
            is_primary: true,
          });
        }
      }
    } else if (profileTrackName) {
      // Create new profile
      profile = dbQueries.createProfile({
        name: profileTrackName,
        full_name: parsedData.fullName || "Applicant Candidate",
        email: parsedData.email,
        phone: parsedData.phone,
        location: parsedData.location,
        summary: parsedData.summary,
        skills: JSON.stringify(parsedData.skills),
        seniority: parsedData.seniority,
        experience_years: parsedData.experienceYears,
        resume_parsed: JSON.stringify(parsedData),
      });

      if (filePath && fs.existsSync(filePath)) {
        const storedPath = this.archiveResumeFile(filePath, profile.id);
        if (storedPath) {
          dbQueries.updateProfile(profile.id, { resume_path: storedPath });
          document = dbQueries.insertDocument({
            profile_id: profile.id,
            name: path.basename(filePath),
            type: "resume",
            file_path: storedPath,
            content_text: rawText,
            is_primary: true,
          });
        }
      }
    }

    return {
      parsedData,
      profile,
      document,
    };
  }

  private archiveResumeFile(sourcePath: string, profileId: string): string | undefined {
    try {
      let destDir = this.options.storageDir;
      if (!destDir) {
        try {
          const { app } = require("electron");
          destDir = path.join(app.getPath("userData"), "resumes");
        } catch {
          destDir = path.join(process.cwd(), ".applykit-resumes");
        }
      }
      fs.mkdirSync(destDir, { recursive: true });
      const ext = path.extname(sourcePath) || ".pdf";
      const destPath = path.join(destDir, `${profileId}${ext}`);
      fs.copyFileSync(sourcePath, destPath);
      return destPath;
    } catch (err) {
      console.warn("[DocumentIntakeService] Could not archive resume file:", err);
      return undefined;
    }
  }
}

export const documentIntakeService = new DocumentIntakeService();
