/**
 * Job deduplication engine.
 * Checks for duplicate job postings by (source, source_id) or content_hash.
 */

import { getJobPostingBySourceId, getJobPostings } from "@/lib/main/db-queries";
import type { RawJobPosting } from "./types";
import { normalizeRawJob } from "./normalizer";

export interface DedupCheckResult {
  isDuplicate: boolean;
  existingId?: string;
  reason?: "source_id" | "content_hash";
}

/**
 * Check if a raw job posting is already present in the database.
 */
export function checkDuplicateJob(raw: RawJobPosting): DedupCheckResult {
  // 1. Check unique (source, source_id)
  const existingBySource = getJobPostingBySourceId(raw.source, raw.sourceId);
  if (existingBySource) {
    return {
      isDuplicate: true,
      existingId: existingBySource.id,
      reason: "source_id",
    };
  }

  // 2. Check content_hash match
  const normalized = normalizeRawJob(raw);
  const existingPostings = getJobPostings({ limit: 500 });
  const existingByHash = existingPostings.find((p) => p.content_hash === normalized.content_hash);

  if (existingByHash) {
    return {
      isDuplicate: true,
      existingId: existingByHash.id,
      reason: "content_hash",
    };
  }

  return { isDuplicate: false };
}
