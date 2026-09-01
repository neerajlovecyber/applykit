import { z } from "zod";

export const legacyIpcSchema = {
  "jobs:get": {
    args: z.tuple([z.string().optional()]),
    return: z.array(z.any()),
  },
  "jobs:add": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.any(),
  },
  "jobs:update-status": {
    args: z.tuple([
      z.object({
        id: z.string(),
        status: z.string(),
        errorMessage: z.string().optional(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "jobs:remove": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
  "jobs:clear-completed": {
    args: z.tuple([]),
    return: z.void().or(z.any()),
  },
  "jobs:get-stats": {
    args: z.tuple([]),
    return: z.record(z.string(), z.number()).or(z.any()),
  },
  "history:get": {
    args: z.tuple([z.any().optional()]),
    return: z.array(z.any()),
  },
  "history:add": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.any(),
  },
  "history:get-stats": {
    args: z.tuple([]),
    return: z.record(z.string(), z.number()).or(z.any()),
  },
  "app:get-version": {
    args: z.tuple([]),
    return: z.string(),
  },
  "app:check-updates": {
    args: z.tuple([]),
    return: z.any(),
  },
} as const;
