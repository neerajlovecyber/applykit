import { z } from "zod";
import type { Application } from "./types";

export const applicationIpcSchema = {
  "applications:get": {
    args: z.tuple([z.string().optional()]),
    return: z.custom<Application[]>().or(z.array(z.any())),
  },
  "applications:get-by-id": {
    args: z.tuple([z.string()]),
    return: z.custom<Application | undefined>().or(z.any()),
  },
  "applications:get-by-job": {
    args: z.tuple([z.string()]),
    return: z.custom<Application | undefined>().or(z.any()),
  },
  "applications:create": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.custom<Application>().or(z.any()),
  },
  "applications:update-status": {
    args: z.tuple([
      z.object({
        id: z.string(),
        status: z.string(),
        errorMessage: z.string().optional(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "applications:update-outcome": {
    args: z.tuple([
      z.object({
        id: z.string(),
        outcome: z.string(),
        note: z.string().optional(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "applications:update-materials": {
    args: z.tuple([
      z.object({
        id: z.string(),
        data: z.record(z.string(), z.any()),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "applications:update-fill-details": {
    args: z.tuple([
      z.object({
        id: z.string(),
        data: z.record(z.string(), z.any()),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "applications:get-with-jobs": {
    args: z.tuple([z.string().optional()]),
    return: z.array(z.any()),
  },
  "applications:clear-history": {
    args: z.tuple([z.string().optional()]),
    return: z.void().or(z.any()),
  },
  "applications:get-stats": {
    args: z.tuple([]),
    return: z.record(z.string(), z.number()).or(z.any()),
  },
} as const;
