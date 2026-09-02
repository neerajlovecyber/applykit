/**
 * Conveyor Domain Contract Types.
 *
 * Provides type-safe contracts for inter-process communication (IPC)
 * between the Electron Main Process and the Renderer UI.
 */

import type {
  ProfileRecord,
  JobPostingRecord,
  ApplicationRecord,
  QABankRecord,
  SearchQueryRecord,
  PlatformRecord,
  TaskRecord,
  DocumentRecord,
  AutomationPlanRecord,
  SettingRecord,
} from "@/lib/db/schema";

export type Profile = ProfileRecord & {
  years_experience?: number | null;
  expected_salary?: number | null;
  title?: string | null;
};

export type JobPosting = JobPostingRecord;
export type Application = ApplicationRecord;
export type QABankEntry = QABankRecord;
export type SearchQuery = SearchQueryRecord;
export type Platform = PlatformRecord;
export type Task = TaskRecord;
export type Document = DocumentRecord;
export type AutomationPlan = AutomationPlanRecord;
export type Setting = SettingRecord;
