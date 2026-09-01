import { z } from "zod";

export const settingsIpcSchema = {
  "settings:get-all": {
    args: z.tuple([]),
    return: z.record(z.string(), z.string()).or(z.any()),
  },
  "settings:get": {
    args: z.tuple([z.string()]),
    return: z.string().nullable().or(z.any()),
  },
  "settings:set": {
    args: z.tuple([
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
} as const;
