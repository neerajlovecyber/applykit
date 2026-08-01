/**
 * Playwright Browser Pool with stealth & anti-detection features.
 *
 * Configures persistent contexts, custom user-agents, window sizes,
 * and stealth launch arguments.
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface BrowserPoolOptions {
  headless?: boolean;
  userDataDir?: string;
  viewport?: { width: number; height: number };
}

let activeBrowser: Browser | null = null;
let activeContext: BrowserContext | null = null;

/**
 * Launch or reuse a stealth Playwright Chromium instance.
 */
export async function getBrowserContext(options?: BrowserPoolOptions): Promise<BrowserContext> {
  if (activeContext) {
    try {
      // Test if active context is still responsive
      activeContext.pages();
      return activeContext;
    } catch {
      activeContext = null;
      activeBrowser = null;
    }
  }

  const isHeadless = options?.headless ?? false; // Default to headed for user visibility/debug

  activeBrowser = await chromium.launch({
    headless: isHeadless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1366,768",
    ],
  });

  activeContext = await activeBrowser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: options?.viewport || { width: 1366, height: 768 },
    locale: "en-US",
    timezoneId: "Asia/Kolkata",
    permissions: ["geolocation", "notifications"],
  });

  // Inject stealth script override for navigator.webdriver
  await activeContext.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
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
 * Close the managed browser instances cleanly.
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

  if (activeBrowser) {
    try {
      await activeBrowser.close();
    } catch {
      // ignore
    }
    activeBrowser = null;
  }
}
