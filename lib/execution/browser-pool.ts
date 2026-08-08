/**
 * Playwright Browser Pool with stealth & anti-detection features.
 *
 * Profile Strategy (mirrors GodsScion/Auto_job_applier_linkedIn → helpers.py:find_default_profile_directory):
 *
 *   1. Try to locate the user's REAL Chrome "User Data" directory.
 *      If found → Playwright opens with the same profile, so existing
 *      LinkedIn / Naukri sessions are ALREADY logged in. No password needed.
 *
 *   2. If Chrome profile not found (e.g. Chrome not installed) →
 *      Fall back to an ApplyKit-specific persistent profile at
 *      ~/.applykit/browser_profile  (gets populated on first login).
 *
 * Anti-detection:
 *   - `--disable-blink-features=AutomationControlled` removes navigator.webdriver flag
 *   - InitScript override ensures navigator.webdriver === undefined
 *   - Realistic user-agent string (matches current Chrome)
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import path from "path";
import os from "os";
import fs from "fs";

export interface BrowserPoolOptions {
  headless?: boolean;
  /** Override which profile dir to use. Pass "chrome" to force real Chrome profile. */
  userDataDir?: string;
  viewport?: { width: number; height: number };
  /** When true, always use the ApplyKit isolated profile even if Chrome is present */
  useIsolatedProfile?: boolean;
}

// One shared context per process (reused across calls)
let activeContext: BrowserContext | null = null;

// ApplyKit fallback profile (persists across sessions once logged in)
const APPLYKIT_PROFILE_DIR = path.join(os.homedir(), ".applykit", "browser_profile");

// ─────────────────────────────────────────────────────────────────────────────
// Real Chrome profile detection
// Mirrors GodsScion helpers.py → find_default_profile_directory()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the real Google Chrome "User Data" directory on the current OS.
 * Returns the path if found, or null if Chrome isn't installed.
 */
export function findChromeUserDataDir(): string | null {
  const home = os.homedir();
  let candidates: string[] = [];

  if (process.platform === "win32") {
    // Windows — most common locations
    candidates = [
      path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data"),
      path.join(process.env.USERPROFILE || home, "AppData", "Local", "Google", "Chrome", "User Data"),
      // Chrome Beta / Canary
      path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome Beta", "User Data"),
      path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome SxS", "User Data"),
    ];
  } else if (process.platform === "linux") {
    candidates = [
      path.join(home, ".config", "google-chrome"),
      path.join(home, ".config", "chromium"),
      path.join(home, ".var", "app", "com.google.Chrome", "data", ".config", "google-chrome"),
    ];
  } else if (process.platform === "darwin") {
    candidates = [
      path.join(home, "Library", "Application Support", "Google", "Chrome"),
      path.join(home, "Library", "Application Support", "Chromium"),
    ];
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      console.log(`[BrowserPool] Found real Chrome profile at: ${candidate}`);
      return candidate;
    }
  }

  console.warn("[BrowserPool] Real Chrome profile not found. Using ApplyKit isolated profile.");
  return null;
}

/**
 * Resolve which user-data-dir to use for this session.
 *
 * Priority:
 *   1. Explicit userDataDir option
 *   2. Real Chrome profile (if found and useIsolatedProfile !== true)
 *   3. ApplyKit fallback profile
 */
function resolveUserDataDir(options?: BrowserPoolOptions): string {
  if (options?.userDataDir) return options.userDataDir;
  if (!options?.useIsolatedProfile) {
    const chromeDir = findChromeUserDataDir();
    if (chromeDir) return chromeDir;
  }
  // Ensure fallback dir exists
  fs.mkdirSync(APPLYKIT_PROFILE_DIR, { recursive: true });
  return APPLYKIT_PROFILE_DIR;
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser context management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Launch or reuse a stealth Playwright Chromium instance.
 *
 * Uses the real Chrome User Data directory by default so that existing
 * LinkedIn / Naukri sessions are active without re-login.
 */
export async function getBrowserContext(options?: BrowserPoolOptions): Promise<BrowserContext> {
  // Reuse existing context if still alive
  if (activeContext) {
    try {
      activeContext.pages(); // throws if context is closed
      return activeContext;
    } catch {
      activeContext = null;
    }
  }

  const userDataDir = resolveUserDataDir(options);
  const isHeadless = options?.headless ?? false;

  console.log(`[BrowserPool] Launching with profile: ${userDataDir}`);

  activeContext = await chromium.launchPersistentContext(userDataDir, {
    headless: isHeadless,
    // No `channel: "chrome"` here — we use Playwright's bundled Chromium so it
    // launches as a SEPARATE process even when Chrome is already running.
    // It still reads the same User Data dir (cookies, sessions) but opens its
    // own independent window instead of a tab inside your existing Chrome.
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--disable-notifications",
      "--start-maximized",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    viewport: options?.viewport ?? null,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "Asia/Kolkata",
    permissions: ["geolocation", "notifications"],
  });

  // Stealth patch: hide navigator.webdriver on every page/frame load
  await activeContext.addInitScript(() => {
    // Remove the webdriver property entirely
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });

    // Spoof plugins (empty in headless/automation contexts)
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5], // non-zero length
    });

    // Spoof languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });

  return activeContext;
}

/**
 * Create a new page in the managed browser context.
 */
export async function createStealthPage(options?: BrowserPoolOptions): Promise<Page> {
  const context = await getBrowserContext(options);
  return context.newPage();
}

/**
 * Create a page using the ApplyKit isolated profile (NOT the real Chrome profile).
 * Use this when you don't want to touch the user's real Chrome sessions.
 */
export async function createIsolatedPage(options?: Omit<BrowserPoolOptions, "useIsolatedProfile">): Promise<Page> {
  return createStealthPage({ ...options, useIsolatedProfile: true });
}

/**
 * Close the managed browser context cleanly.
 */
export async function closeBrowserPool(): Promise<void> {
  if (activeContext) {
    try {
      await activeContext.close();
    } catch {
      // ignore
    }
    activeContext = null;
  }
}

