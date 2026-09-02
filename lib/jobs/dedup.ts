/**
 * Job deduplication engine.
 * Checks for duplicate job postings by (source, source_id) or content_hash.
 */

import { getJobPostingBySourceId, getJobPostingByContentHash } from "@/lib/db";
import type { RawJobPosting } from "./types";
import { normalizeRawJob } from "./normalizer";

export interface DedupCheckResult {
  isDuplicate: boolean;
  existingId?: string;
  reason?: "source_id" | "content_hash";
}

/**
 * Check if a raw job posting is already present in the database.
 * Uses indexed O(1) lookups for both (source, source_id) and content_hash.
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

  // 2. Check content_hash match using indexed query
  const normalized = normalizeRawJob(raw);
  if (normalized.content_hash) {
    const existingByHash = getJobPostingByContentHash(normalized.content_hash);
    if (existingByHash) {
      return {
        isDuplicate: true,
        existingId: existingByHash.id,
        reason: "content_hash",
      };
    }
  }

  return { isDuplicate: false };
}
