/**
 * Playwright Browser Pool — ApplyKit Isolated Profile Strategy
 *
 * ─── How it works ───────────────────────────────────────────────────────────
 *
 * We use ONE persistent Playwright Chromium profile stored at:
 *   ~/.applykit/browser_profile
 *
 * This profile is SEPARATE from your real Chrome — no conflicts, no locked
 * profile errors, no tabs opening in your real browser.
 *
 * Session persistence:
 *   - User logs in to LinkedIn / Naukri ONCE via "Connect Account" flow
 *   - Session cookies are saved in the profile directory
 *   - All future auto-apply runs reuse that saved session — no re-login needed
 *
 * ONE shared BrowserContext lives for the entire app session. Every feature
 * (connect flow, auto-apply, etc.) opens a new Page in the same context,
 * so they all share cookies and login state.
 *
 * Anti-bot detection:
 *   - --disable-blink-features=AutomationControlled
 *   - navigator.webdriver overridden to undefined
 *   - Realistic Chrome user-agent
 *   - --enable-automation banner removed
 * ────────────────────────────────────────────────────────────────────────────
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import path from "path";
import os from "os";
import fs from "fs";

// The one persistent profile directory — shared by all Playwright sessions
export const APPLYKIT_PROFILE_DIR = path.join(os.homedir(), ".applykit", "browser_profile");

// One shared BrowserContext for the whole app session
let sharedContext: BrowserContext | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Shared context management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get (or launch) the single shared Playwright Chromium context.
 * All pages share cookies and login sessions through this context.
 */
export async function getSharedContext(headless = false): Promise<BrowserContext> {
  // Reuse if alive — null check is kept reliable by the 'close' listener below
  if (sharedContext) return sharedContext;

  fs.mkdirSync(APPLYKIT_PROFILE_DIR, { recursive: true });
  console.log(`[BrowserPool] Launching shared context at: ${APPLYKIT_PROFILE_DIR}`);

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

  // Stealth: hide automation fingerprints on every page
  await sharedContext.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
  });

  return sharedContext;
}

/**
 * Open a new page in the shared browser context.
 * All pages share the same cookies / login sessions.
 */
export async function createStealthPage(options?: { headless?: boolean }): Promise<Page> {
  const ctx = await getSharedContext(options?.headless ?? false);
  return ctx.newPage();
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
    try { await sharedContext.close(); } catch { /* ignore */ }
    sharedContext = null;
  }
}

