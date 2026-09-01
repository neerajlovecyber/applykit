/**
 * Playwright Browser Pool — Stealth & Profile Management
 *
 * ─── How it works ───────────────────────────────────────────────────────────
 *
 * Uses `playwright-extra` with `puppeteer-extra-plugin-stealth` to automatically
 * bypass modern anti-bot systems (Cloudflare, LinkedIn Bot Detection, Naukri Bot Shield)
 * by applying full evasion prototypes (chrome.runtime, PluginArray, WebGL, permissions).
 *
 * Profile persistence:
 *   - Stored at ~/.applykit/browser_profile (isolated from user's regular Chrome)
 *   - Session cookies are persisted across runs (login once, reused everywhere)
 *   - Automatic context switching handles headless vs visible transitions cleanly
 * ────────────────────────────────────────────────────────────────────────────
 */

import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import type { BrowserContext, Page } from "playwright";
import path from "path";
import os from "os";
import fs from "fs";

// Initialize stealth plugin once on the chromium instance
const stealth = stealthPlugin();
chromium.use(stealth);

// The persistent profile directory — shared by all Playwright sessions
export const APPLYKIT_PROFILE_DIR = path.join(os.homedir(), ".applykit", "browser_profile");

// Active shared BrowserContext and tracking for its headless mode
let sharedContext: BrowserContext | null = null;
let currentHeadlessMode: boolean | null = null;

/**
 * Get (or launch) the shared Playwright Chromium context with stealth plugins.
 * Automatically switches context if a different headless mode is requested.
 */
export async function getSharedContext(headless = false): Promise<BrowserContext> {
  // Check if existing sharedContext is still alive
  if (sharedContext) {
    try {
      if (sharedContext.browser() && !sharedContext.browser()?.isConnected()) {
        sharedContext = null;
        currentHeadlessMode = null;
      } else if (currentHeadlessMode !== headless) {
        // Mode changed (e.g. was headless batch, now visible human login or vice-versa)
        console.log(
          `[BrowserPool] Switching context from headless=${currentHeadlessMode} to headless=${headless}. Gracefully closing previous context.`,
        );
        await sharedContext.close().catch(() => {});
        sharedContext = null;
        currentHeadlessMode = null;
      } else {
        // Ping pages to ensure context is healthy
        sharedContext.pages();
        return sharedContext;
      }
    } catch {
      sharedContext = null;
      currentHeadlessMode = null;
    }
  }

  fs.mkdirSync(APPLYKIT_PROFILE_DIR, { recursive: true });
  console.log(`[BrowserPool] Launching stealth context (headless=${headless}) at: ${APPLYKIT_PROFILE_DIR}`);

  sharedContext = await chromium.launchPersistentContext(APPLYKIT_PROFILE_DIR, {
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--disable-notifications",
      "--start-maximized",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    viewport: null, // use natural window size
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "Asia/Kolkata",
    permissions: ["geolocation", "notifications"],
  });

  currentHeadlessMode = headless;

  // Automatically reset state on browser close
  sharedContext.on("close", () => {
    console.log("[BrowserPool] Browser context closed. Resetting pool state.");
    sharedContext = null;
    currentHeadlessMode = null;
  });

  return sharedContext;
}

/**
 * Open a new page in the stealth browser context.
 * Automatically recovers if the browser was previously closed or invalid.
 */
export async function createStealthPage(options?: { headless?: boolean }): Promise<Page> {
  const isHeadless = options?.headless ?? false;
  try {
    const ctx = await getSharedContext(isHeadless);
    return await ctx.newPage();
  } catch (err) {
    console.warn("[BrowserPool] Context closed or invalid. Re-launching browser...", err);
    sharedContext = null;
    currentHeadlessMode = null;
    const ctx = await getSharedContext(isHeadless);
    return await ctx.newPage();
  }
}

/** @deprecated Use createStealthPage() — kept for backwards compatibility */
export async function getBrowserContext(): Promise<BrowserContext> {
  return getSharedContext();
}

/** @deprecated Use createStealthPage() — kept for backwards compatibility */
export async function createIsolatedPage(): Promise<Page> {
  return createStealthPage();
}

/**
 * Close the shared browser context (call on app exit).
 */
export async function closeBrowserPool(): Promise<void> {
  if (sharedContext) {
    try {
      await sharedContext.close();
    } catch {
      // ignore
    }
    sharedContext = null;
    currentHeadlessMode = null;
  }
}
