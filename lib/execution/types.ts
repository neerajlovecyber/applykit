/**
 * Execution layer type definitions for browser automation and form filling.
 */

import type { Page } from "playwright";

export interface FormFieldResult {
  selector?: string;
  label?: string;
  fieldType: "text" | "select" | "radio" | "checkbox" | "file" | "textarea" | "unknown";
  filledValue?: string;
  success: boolean;
  source: "profile" | "qa_bank" | "ai_generated" | "default";
  error?: string;
}

export interface FormFillSummary {
  stepName: string;
  fieldsTotal: number;
  fieldsFilled: number;
  fieldsFailed: number;
  details: FormFieldResult[];
  screenshotPath?: string;
}

export interface ApplicationExecuteOptions {
  applicationId: string;
  jobUrl: string;
  platform: string;
  profileId: string;
  resumePath?: string;
  coverLetterText?: string;
  pauseBeforeSubmit?: boolean;
}

export interface ApplicationExecuteResult {
  success: boolean;
  status: "submitted" | "failed" | "pending_review";
  fieldsFilled: number;
  fieldsTotal: number;
  screenshotPath?: string;
  errorMessage?: string;
}

export interface PlatformApplier {
  readonly platformId: string;
  apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult>;
}
