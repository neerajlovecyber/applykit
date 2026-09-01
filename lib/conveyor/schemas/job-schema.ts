import { z } from "zod";
import type { JobPosting } from "@/lib/main/db-queries";

export const jobIpcSchema = {
  "job-postings:get": {
    args: z.tuple([
      z.object({
        state: z.string().optional(),
        source: z.string().optional(),
        minScore: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional(),
    ]),
    return: z.custom<JobPosting[]>().or(z.array(z.any())),
  },
  "job-postings:get-by-id": {
    args: z.tuple([z.string()]),
    return: z.custom<JobPosting | undefined>().or(z.any()),
  },
  "job-postings:get-by-source": {
    args: z.tuple([
      z.object({
        source: z.string(),
        sourceId: z.string(),
      }),
    ]),
    return: z.custom<JobPosting | undefined>().or(z.any()),
  },
  "job-postings:upsert": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.custom<JobPosting>().or(z.any()),
  },
  "job-postings:update-state": {
    args: z.tuple([
      z.object({
        id: z.string(),
        state: z.string(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "job-postings:update-score": {
    args: z.tuple([
      z.object({
        id: z.string(),
        score: z.number(),
        breakdown: z.string().optional(),
        explanation: z.string().optional(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "job-postings:get-stats": {
    args: z.tuple([]),
    return: z.object({
      total: z.number(),
      new: z.number(),
      scored: z.number(),
      queued: z.number(),
      applied: z.number(),
      skipped: z.number(),
    }).or(z.record(z.string(), z.number())).or(z.any()),
  },
} as const;
