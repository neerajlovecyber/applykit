/**
 * Application state machine for managing job posting and application lifecycles.
 *
 * Inspired by AutoApply's state_machine.py — defines valid transitions
 * and ensures only legal state changes are allowed.
 */

// ═══════════════════════════════════════════════════════════
// JOB POSTING STATES
// ═══════════════════════════════════════════════════════════

export type JobState =
  | "new"          // Just discovered from search
  | "scored"       // Match scoring complete
  | "queued"       // Queued for materials generation
  | "generating"   // Materials being generated
  | "pending_review" // Materials ready, awaiting user review
  | "approved"     // User approved for application
  | "applying"     // Browser automation in progress
  | "needs_human_action" // Paused for CAPTCHA/2FA or user manual solve
  | "applied"      // Successfully submitted
  | "skipped"      // User skipped or below threshold
  | "failed"       // Application failed
  | "expired";     // Job posting no longer available

const JOB_TRANSITIONS: Record<JobState, JobState[]> = {
  new:                ["scored", "skipped", "expired"],
  scored:             ["queued", "skipped"],
  queued:             ["generating", "skipped"],
  generating:         ["pending_review", "failed"],
  pending_review:     ["approved", "skipped"],
  approved:           ["applying", "skipped"],
  applying:           ["applied", "failed", "needs_human_action"],
  needs_human_action: ["applying", "failed", "skipped", "applied"],
  applied:            [],
  skipped:            ["queued"],  // Allow re-queue of skipped jobs
  failed:             ["queued"],  // Allow retry
  expired:            [],
};

// ═══════════════════════════════════════════════════════════
// APPLICATION STATES
// ═══════════════════════════════════════════════════════════

export type ApplicationStatus =
  | "pending_review"     // Awaiting user review
  | "approved"           // User approved for submission
  | "applying"           // Browser automation in progress
  | "needs_human_action" // Paused for CAPTCHA/2FA
  | "submitted"          // Successfully submitted
  | "failed"             // Application failed
  | "skipped";           // User rejected

const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending_review:     ["approved", "skipped"],
  approved:           ["applying", "skipped"],
  applying:           ["submitted", "failed", "needs_human_action"],
  needs_human_action: ["applying", "submitted", "failed", "skipped"],
  submitted:          [],
  failed:             ["pending_review"],  // Allow retry
  skipped:            ["pending_review"],  // Allow reconsideration
};

// ═══════════════════════════════════════════════════════════
// APPLICATION OUTCOMES
// ═══════════════════════════════════════════════════════════

export type ApplicationOutcome =
  | "pending"      // No response yet
  | "rejected"     // Rejection received
  | "oa"           // Online assessment
  | "interview"    // Interview scheduled
  | "offer"        // Offer received
  | "withdrawn";   // User withdrew

const OUTCOME_TRANSITIONS: Record<ApplicationOutcome, ApplicationOutcome[]> = {
  pending:    ["rejected", "oa", "interview", "offer", "withdrawn"],
  rejected:   [],
  oa:         ["rejected", "interview", "offer", "withdrawn"],
  interview:  ["rejected", "offer", "withdrawn"],
  offer:      ["withdrawn"],
  withdrawn:  [],
};

// ═══════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════

export function canTransitionJob(from: JobState, to: JobState): boolean {
  return JOB_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return APPLICATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionOutcome(from: ApplicationOutcome, to: ApplicationOutcome): boolean {
  return OUTCOME_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validate and return the transition, throwing if invalid.
 */
export function assertJobTransition(from: JobState, to: JobState): void {
  if (!canTransitionJob(from, to)) {
    throw new Error(`Invalid job state transition: ${from} → ${to}`);
  }
}

export function assertApplicationTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (!canTransitionApplication(from, to)) {
    throw new Error(`Invalid application status transition: ${from} → ${to}`);
  }
}

/**
 * Get all valid next states for a given job state.
 */
export function getValidJobTransitions(state: JobState): JobState[] {
  return JOB_TRANSITIONS[state] ?? [];
}

/**
 * Get all valid next statuses for a given application status.
 */
export function getValidApplicationTransitions(status: ApplicationStatus): ApplicationStatus[] {
  return APPLICATION_TRANSITIONS[status] ?? [];
}

/**
 * Build a state history entry.
 */
export function createStateHistoryEntry(from: string | null, to: string, reason?: string): {
  from: string | null;
  to: string;
  at: string;
  reason: string | null;
} {
  return {
    from,
    to,
    at: new Date().toISOString(),
    reason: reason ?? null,
  };
}
