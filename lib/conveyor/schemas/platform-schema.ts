import { z } from "zod";

export const platformIpcSchema = {
  "platforms:get": {
    args: z.tuple([]),
    return: z.array(z.any()),
  },
  "platforms:get-by-id": {
    args: z.tuple([z.string()]),
    return: z.any(),
  },
  "platforms:update-status": {
    args: z.tuple([
      z.object({
        id: z.string(),
        status: z.string(),
        cookies: z.string().optional(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "platforms:update-auth-token": {
    args: z.tuple([
      z.object({
        id: z.string(),
        authToken: z.string(),
        status: z.string().optional(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "platforms:login-naukri": {
    args: z.tuple([
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    ]),
    return: z.any(),
  },
  "platforms:update-daily-count": {
    args: z.tuple([
      z.object({
        id: z.string(),
        count: z.number(),
      }),
    ]),
    return: z.void().or(z.any()),
  },
  "platforms:reset-daily-counts": {
    args: z.tuple([]),
    return: z.void().or(z.any()),
  },
  "naukri:launch-browser": {
    args: z.tuple([]),
    return: z.any(),
  },
  "naukri:is-connected": {
    args: z.tuple([]),
    return: z.object({ connected: z.boolean() }).or(z.any()),
  },
  "naukri:connect": {
    args: z.tuple([]),
    return: z.any(),
  },
  "naukri:disconnect": {
    args: z.tuple([]),
    return: z.any(),
  },
  "naukri:auto-apply": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.any(),
  },
  "linkedin:is-connected": {
    args: z.tuple([]),
    return: z.object({ connected: z.boolean() }).or(z.any()),
  },
  "linkedin:connect": {
    args: z.tuple([]),
    return: z.any(),
  },
  "linkedin:disconnect": {
    args: z.tuple([]),
    return: z.any(),
  },
  "linkedin:auto-apply": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.any(),
  },
} as const;
