import { z } from "zod";
import type { Profile } from "./types";

export const profileIpcSchema = {
  "profiles:get": {
    args: z.tuple([]),
    return: z.custom<Profile[]>().or(z.array(z.any())),
  },
  "profiles:get-active": {
    args: z.tuple([]),
    return: z.custom<Profile | undefined>().or(z.any()),
  },
  "profiles:get-by-id": {
    args: z.tuple([z.string()]),
    return: z.custom<Profile | undefined>().or(z.any()),
  },
  "profiles:create": {
    args: z.tuple([z.record(z.string(), z.any())]),
    return: z.custom<Profile>().or(z.any()),
  },
  "profiles:update": {
    args: z.tuple([
      z.object({
        id: z.string(),
        data: z.record(z.string(), z.any()),
      }),
    ]),
    return: z.custom<Profile | undefined>().or(z.any()),
  },
  "profiles:set-active": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
  "profiles:delete": {
    args: z.tuple([z.string()]),
    return: z.void().or(z.any()),
  },
} as const;
