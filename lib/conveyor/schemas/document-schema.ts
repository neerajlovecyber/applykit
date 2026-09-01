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
} as const;
