import { z } from "zod";

export const taskIpcSchema = {
  "tasks:get": {
    args: z.tuple([z.any().optional()]),
    return: z.array(z.any()),
  },
  "tasks:get-by-id": {
    args: z.tuple([z.string()]),
    return: z.any(),
  },
  "tasks:create": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.any(),
  },
  "tasks:enqueue": {
    args: z.tuple([
      z.object({
        kind: z.string(),
        payload: z.record(z.string(), z.any()).optional(),
        jobId: z.string().optional(),
        applicationId: z.string().optional(),
        priority: z.number().optional(),
      }),
    ]),
    return: z.any(),
  },
  "tasks:update-status": {
    args: z.tuple([
      z.object({
        id: z.string(),
        status: z.string(),
        resultData: z.string().optional(),
        result: z.string().optional(),
        errorMessage: z.string().optional(),
        error: z.string().optional(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "tasks:get-stats": {
    args: z.tuple([]),
    return: z.record(z.string(), z.number()).or(z.any()),
  },
  "search:execute": {
    args: z.tuple([
      z.object({
        options: z.record(z.string(), z.any()),
        queryId: z.string().optional(),
      }),
    ]),
    return: z.any(),
  },
  "search-queries:get": {
    args: z.tuple([z.string().optional()]),
    return: z.array(z.any()),
  },
  "search-queries:get-by-id": {
    args: z.tuple([z.string()]),
    return: z.any(),
  },
  "search-queries:create": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.any(),
  },
  "search-queries:update": {
    args: z.tuple([
      z.object({
        id: z.string(),
        data: z.record(z.string(), z.any()),
      }),
    ]),
    return: z.any(),
  },
  "search-queries:update-status": {
    args: z.tuple([
      z.object({
        id: z.string(),
        status: z.string(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "search-queries:record-run": {
    args: z.tuple([
      z.object({
        id: z.string(),
        foundCount: z.number(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "search-queries:delete": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
} as const;
