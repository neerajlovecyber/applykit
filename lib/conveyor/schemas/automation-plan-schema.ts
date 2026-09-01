import { z } from "zod";

export const automationPlanIpcSchema = {
  "automation-plans:get": {
    args: z.tuple([z.string().optional()]),
    return: z.array(z.any()),
  },
  "automation-plans:get-by-id": {
    args: z.tuple([z.string()]),
    return: z.any(),
  },
  "automation-plans:create": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.any(),
  },
  "automation-plans:update": {
    args: z.tuple([
      z.object({
        id: z.string(),
        data: z.record(z.string(), z.any()),
      }),
    ]),
    return: z.any(),
  },
  "automation-plans:record-run": {
    args: z.tuple([
      z.object({
        id: z.string(),
        appliedCount: z.number(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "automation-plans:delete": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
} as const;
