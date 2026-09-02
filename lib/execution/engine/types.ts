/**
 * Platform Strategy & Form Automation Engine Types.
 *
 * Provides a clean Ports & Adapters abstraction for multi-step job application wizards.
 */

import type { Page } from "playwright";

export interface ModalOpenResult {
  success: boolean;
  alreadyApplied?: boolean;
  requiresExternalApply?: boolean;
  errorMessage?: string;
}

export interface PlatformApplyStrategy {
  /** Identifier for this platform (e.g., 'linkedin', 'naukri', 'indeed', 'generic') */
  readonly platform: string;

  /**
   * Navigate to the job and open the application modal or trigger the apply flow.
   */
  openApplyModal(page: Page, jobUrl: string): Promise<ModalOpenResult>;

  /**
   * Check if the modal or form is currently open and active.
   */
  isModalOpen(page: Page): Promise<boolean>;

  /**
   * CSS selector for the modal or wizard container element to scan for fields.
   */
  getModalContainerSelector(): string;

  /**
   * Locate the "Next", "Continue", or "Review" button on the current step.
   */
  findNextButton(page: Page): Promise<any | null>;

  /**
   * Locate the final "Submit application" button on the current step.
   */
  findSubmitButton(page: Page): Promise<any | null>;

  /**
   * Optional platform-specific form/chatbot filler.
   * If implemented and returns handled: true, FormAutomationEngine uses this instead of generic FormFiller.
   */
  fillStep?(page: Page, profile: any, stepIndex: number): Promise<StepFillResult>;

  /**
   * Optional hook called before filling fields on a step (e.g. dismiss popups, wait for animations).
   */
  beforeStepFill?(page: Page, stepIndex: number): Promise<void>;

  /**
   * Optional hook called after filling fields on a step (e.g. handle validation warnings).
   */
  afterStepFill?(page: Page, stepIndex: number): Promise<void>;

  /**
   * Optional hook called after clicking submit to dismiss post-apply modals or close dialogs.
   */
  dismissPostApplyModal?(page: Page): Promise<void>;
}

export interface StepFillResult {
  handled: boolean;
  fieldsFilled: number;
  completed?: boolean;
}

export interface FormEngineOptions {
  /** Maximum number of wizard steps before aborting to prevent infinite loops (default: 10) */
  maxSteps?: number;
  /** Custom screenshot output directory (default: ~/.applykit/screenshots) */
  screenshotDir?: string;
  /** Skip human-like wait delays (ideal for automated unit tests) */
  skipDelays?: boolean;
}
