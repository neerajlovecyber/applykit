export * from "./linkedin-adapter";
export * from "./indeed-adapter";
export * from "./naukri-adapter";

import type { JobDiscoveryAdapter } from "../types";
import { LinkedInDiscoveryAdapter } from "./linkedin-adapter";
import { IndeedDiscoveryAdapter } from "./indeed-adapter";
import { NaukriDiscoveryAdapter } from "./naukri-adapter";

export function getDiscoveryAdapter(platform: string): JobDiscoveryAdapter | undefined {
  const p = (platform || "").toLowerCase();
  if (p === "linkedin") return new LinkedInDiscoveryAdapter();
  if (p === "indeed") return new IndeedDiscoveryAdapter();
  if (p === "naukri") return new NaukriDiscoveryAdapter();
  return undefined;
}

