/**
 * Content hashing utilities for deduplication and change detection.
 */

import { createHash } from "crypto";

/**
 * Generate SHA-256 hash of content string.
 * Used for job posting dedup (content_hash field).
 */
export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Generate a content hash for a job posting.
 * Normalizes the description to avoid spurious diffs from whitespace changes.
 */
export function hashJobContent(title: string, company: string, description: string): string {
  const normalized = [title, company, description]
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  return sha256(normalized);
}

/**
 * Generate a file checksum for document dedup.
 */
export function hashFileContent(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
