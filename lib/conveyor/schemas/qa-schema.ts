import { z } from "zod";
import type { QABankEntry } from "@/lib/main/db-queries";

export const qaIpcSchema = {
  "qa-bank:get": {
    args: z.tuple([z.string().optional()]),
    return: z.custom<QABankEntry[]>().or(z.array(z.any())),
  },
  "qa-bank:find": {
    args: z.tuple([
      z.object({
        profileId: z.string(),
        pattern: z.string(),
      }),
    ]),
    return: z.custom<QABankEntry | undefined>().or(z.any()),
  },
  "qa-bank:find-answer": {
    args: z.tuple([
      z.object({
        profileId: z.string(),
        questionPattern: z.string().optional(),
        pattern: z.string().optional(),
      }),
    ]),
    return: z.custom<QABankEntry | undefined>().or(z.any()),
  },
  "qa-bank:increment-usage": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
  "qa-bank:upsert": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.custom<QABankEntry>().or(z.any()),
  },
  "qa-bank:delete": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
  "qa-bank:clear-ai": {
    args: z.tuple([z.string().optional()]),
    return: z.void().or(z.any()),
  },
  "qa-bank:seed": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
} as const;
