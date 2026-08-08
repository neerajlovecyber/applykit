/**
 * LinkedIn Login Helper
 *
 * Adapted from GodsScion/Auto_job_applier_linkedIn - runAiBot.py:
 *   - is_logged_in_LN()  → isLoggedInLinkedIn()
 *   - login_LN()         → loginLinkedIn()
 *
 * ─── Session Strategy ──────────────────────────────────────────────────────
 * Since browser-pool.ts now uses the REAL Chrome User Data directory,
 * the user is usually ALREADY logged into LinkedIn — no credentials needed.
 *
 * Flow:
 *   1. Navigate to linkedin.com
 *   2. Check if already logged in (URL = /feed/ or global nav present)
 *   3. If yes → skip login entirely  ✅
 *   4. If no  → use provided username/password to log in
 *   5. If no credentials → wait 30s for manual login
 * ──────────────────────────────────────────────────────────────────────────
 */

import type { Page } from "playwright";

export interface LinkedInLoginResult {
  success: boolean;
  alreadyLoggedIn?: boolean;
  errorMessage?: string;
}

/**
 * Check whether the current Playwright page is already logged into LinkedIn.
 * Mirrors the is_logged_in_LN() check from runAiBot.py.
 */
export async function isLoggedInLinkedIn(page: Page): Promise<boolean> {
  try {
    const url = page.url();
    if (url.includes("linkedin.com/feed")) return true;

    // Check for sign-in indicators
    const signInLink = await page.$('a[href*="/login"]');
    const joinLink = await page.$('a[href*="/signup"]');
    if (signInLink || joinLink) return false;

    // Check for feed nav (logged-in state)
    const globalNav = await page.$(".global-nav__me");
    return !!globalNav;
  } catch {
    return false;
  }
}

/**
 * Log into LinkedIn using the provided credentials.
 * Falls back to waiting for manual login if credentials are missing/invalid.
 *
 * Mirrors login_LN() from runAiBot.py.
 */
export async function loginLinkedIn(
  page: Page,
  username: string,
  password: string
): Promise<LinkedInLoginResult> {
  try {
    // Already logged in? Skip.
    const alreadyIn = await isLoggedInLinkedIn(page);
    if (alreadyIn) {
      console.log("[LinkedInLogin] Already logged in, skipping login flow.");
      return { success: true, alreadyLoggedIn: true };
    }

    console.log("[LinkedInLogin] Navigating to LinkedIn login page...");
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for the login form
    await page.waitForSelector("#username", { timeout: 10000 });

    // Fill username
    await page.fill("#username", username);
    await page.waitForTimeout(randomBetween(400, 800));

    // Fill password
    await page.fill("#password", password);
    await page.waitForTimeout(randomBetween(300, 600));

    // Click sign in
    await page.click('button[type="submit"]');

    // Wait for redirect to feed (up to 20s for CAPTCHA / 2FA)
    try {
      await page.waitForURL("**/feed/**", { timeout: 20000 });
      console.log("[LinkedInLogin] Login successful — redirected to feed.");
      return { success: true };
    } catch {
      // Might be on a checkpoint / 2FA / CAPTCHA page — let user resolve manually
      const currentUrl = page.url();
      if (
        currentUrl.includes("checkpoint") ||
        currentUrl.includes("verification") ||
        currentUrl.includes("challenge")
      ) {
        console.warn(
          "[LinkedInLogin] LinkedIn security challenge detected. User may need to verify manually."
        );
        // Wait up to 60s for user to complete the challenge
        try {
          await page.waitForURL("**/feed/**", { timeout: 60000 });
          return { success: true };
        } catch {
          return {
            success: false,
            errorMessage: "Security challenge could not be resolved within 60 seconds.",
          };
        }
      }

      return {
        success: false,
        errorMessage: `Login redirect timeout — current URL: ${currentUrl}`,
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[LinkedInLogin] Login failed:", msg);
    return { success: false, errorMessage: msg };
  }
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
