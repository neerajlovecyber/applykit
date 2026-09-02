import { z } from "zod";

export const documentIpcSchema = {
  "documents:get": {
    args: z.tuple([z.string().optional()]),
    return: z.array(z.any()),
  },
  "documents:get-by-id": {
    args: z.tuple([z.string()]),
    return: z.any(),
  },
  "documents:insert": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.any(),
  },
  "documents:delete": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
  "documents:intake": {
    args: z.tuple([
      z.object({
        filePath: z.string().optional(),
        rawText: z.string().optional(),
        profileId: z.string().optional(),
        profileTrackName: z.string().optional(),
      }),
    ]),
    return: z.any(),
  },
  "documents:pick-file": {
    args: z.tuple([]),
    return: z.any(),
  },
} as const;
