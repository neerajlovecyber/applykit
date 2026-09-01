import { describe, expect, it } from "bun:test";
import { APPLYKIT_PROFILE_DIR, closeBrowserPool } from "./browser-pool";
import path from "path";
import os from "os";

describe("Browser Pool Stealth Engine", () => {
  it("resolves persistent profile directory under user home", () => {
    const expectedPrefix = path.join(os.homedir(), ".applykit");
    expect(APPLYKIT_PROFILE_DIR.startsWith(expectedPrefix)).toBe(true);
    expect(APPLYKIT_PROFILE_DIR).toContain("browser_profile");
  });

  it("exports closeBrowserPool function gracefully handling empty state", async () => {
    await expect(closeBrowserPool()).resolves.toBeUndefined();
  });
});
