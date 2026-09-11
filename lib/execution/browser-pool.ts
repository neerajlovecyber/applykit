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
      "--lang=en-US",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    viewport: null, // use natural window size
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    locale: "en-US",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    },
    timezoneId: "Asia/Kolkata",
    permissions: ["geolocation", "notifications"],
  });

  // Force English language cookie for LinkedIn to prevent automatic Arabic / foreign language switching
  try {
    await sharedContext.addCookies([
      {
        name: "lang",
        value: "v=2&lang=en-us",
        domain: ".linkedin.com",
        path: "/",
      },
      {
        name: "lang",
        value: "v=2&lang=en-us",
        domain: "www.linkedin.com",
        path: "/",
      },
    ]);

    await sharedContext.addInitScript(() => {
      try {
        Object.defineProperty(navigator, "language", { get: () => "en-US" });
        Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
        if (document.location.hostname.includes("linkedin.com")) {
          document.cookie = "lang=v=2&lang=en-us; domain=.linkedin.com; path=/";
        }
      } catch {}
    });
  } catch (err) {
    console.warn("[BrowserPool] Could not seed English language cookie / init script:", err);
  }

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
 * Open or retrieve an active page in the stealth browser context.
 * Reuses existing open page if available to avoid closing and re-launching the browser window repeatedly.
 */
export async function createStealthPage(options?: { headless?: boolean; reuseExisting?: boolean }): Promise<Page> {
  const isHeadless = options?.headless ?? false;
  const reuseExisting = options?.reuseExisting !== false;
  try {
    const ctx = await getSharedContext(isHeadless);
    let page: Page | undefined;

    if (reuseExisting) {
      const livePages = ctx.pages().filter((p) => !p.isClosed());
      if (livePages.length > 0) {
        page = livePages[livePages.length - 1];
      }
    }

    if (!page) {
      page = await ctx.newPage();
    }

    if (!isHeadless) {
      await page.bringToFront().catch(() => {});
      await page.evaluate(() => window.focus()).catch(() => {});
    }
    return page;
  } catch (err) {
    console.warn("[BrowserPool] Context closed or invalid. Re-launching browser...", err);
    sharedContext = null;
    currentHeadlessMode = null;
    const ctx = await getSharedContext(isHeadless);
    const livePages = ctx.pages().filter((p) => !p.isClosed());
    const page = livePages.length > 0 ? livePages[0] : await ctx.newPage();
    if (!isHeadless) {
      await page.bringToFront().catch(() => {});
      await page.evaluate(() => window.focus()).catch(() => {});
    }
    return page;
  }
}

/**
 * Bring the active automation browser window and active page to the front.
 */
export async function bringBrowserToFront(): Promise<boolean> {
  if (!sharedContext) return false;
  try {
    const pages = sharedContext.pages();
    if (pages.length > 0) {
      const activePage = pages[pages.length - 1];
      await activePage.bringToFront();
      await activePage.evaluate(() => window.focus()).catch(() => {});
      return true;
    }
  } catch (err) {
    console.warn("[BrowserPool] Could not bring browser to front:", err);
  }
  return false;
}

/**
 * Check if the browser context is open and connected.
 */
export function isBrowserOpen(): boolean {
  return sharedContext !== null && (sharedContext.browser()?.isConnected() ?? false);
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
 * Acquire a stealth page for automated tasks/discovery.
 */
export async function acquirePage(headless = true): Promise<Page> {
  return createStealthPage({ headless });
}

/**
 * Safely release a page back without closing the entire browser window between batch tasks.
 * If there are multiple tabs, closes extra tabs, but keeps the primary tab alive.
 */
export async function releasePage(page: Page): Promise<void> {
  if (!page || page.isClosed()) return;
  try {
    const allPages = sharedContext?.pages().filter((p) => !p.isClosed()) ?? [];
    // Only close this page if there's at least one other page kept alive
    if (allPages.length > 1) {
      await page.close().catch(() => {});
    }
  } catch {
    // Ignore release errors
  }
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
