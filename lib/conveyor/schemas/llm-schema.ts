import { z } from "zod";

export const llmIpcSchema = {
  "llm:list-providers": {
    args: z.tuple([]),
    return: z.array(z.any()),
  },
  "llm:set-active-provider": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
  "llm:configure-provider": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.void().or(z.any()),
  },
  "llm:test-connection": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.any(),
  },
  "llm:fetch-openrouter-models": {
    args: z.tuple([]),
    return: z.array(z.any()),
  },
  "llm:fetch-provider-models": {
    args: z.tuple([
      z.object({
        provider: z.string(),
        apiKey: z.string().optional(),
      }),
    ]),
    return: z.array(z.any()),
  },
  "llm:score-job": {
    args: z.tuple([
      z.object({
        profileSummary: z.string(),
        jobDescription: z.string(),
      }),
    ]),
    return: z.any(),
  },
  "llm:generate-cover-letter": {
    args: z.tuple([
      z.object({
        profileSummary: z.string(),
        jobDescription: z.string(),
      }),
    ]),
    return: z.any(),
  },
  "llm:answer-question": {
    args: z.tuple([
      z.object({
        profileSummary: z.string(),
        question: z.string(),
        context: z.string().optional(),
      }),
    ]),
    return: z.any(),
  },
  "llm:parse-resume": {
    args: z.tuple([z.string()]),
    return: z.any(),
  },
  "llm:tailor-resume": {
    args: z.tuple([
      z.object({
        profileSummary: z.string(),
        jobDescription: z.string(),
      }),
    ]),
    return: z.any(),
  },
  "resume:pick-and-extract": {
    args: z.tuple([]),
    return: z.any(),
  },
  "resume:store-file": {
    args: z.tuple([
      z.object({
        profileId: z.string(),
        sourcePath: z.string(),
      }),
    ]),
    return: z.string().or(z.any()),
  },
} as const;
