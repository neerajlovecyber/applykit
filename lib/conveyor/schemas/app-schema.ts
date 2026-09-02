import { z } from "zod";

export const appIpcSchema = {
  version: {
    args: z.tuple([]),
    return: z.string(),
  },
  "app:get-version": {
    args: z.tuple([]),
    return: z.string(),
  },
  "app:check-updates": {
    args: z.tuple([]),
    return: z.any(),
  },
};
