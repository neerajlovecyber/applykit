/**
 * Human Cursor Utility for Playwright
 *
 * Uses `human-cursor` (CloverLabsAI) to provide modern human mouse movements,
 * randomized Bézier trajectories, natural easing, and authentic clicks.
 */

import { createCursor } from "human-cursor";
import type { Page, ElementHandle } from "playwright";

type CursorInstance = ReturnType<typeof createCursor>;
const cursorMap = new WeakMap<Page, CursorInstance>();

/**
 * Get or initialize the GhostCursor instance for a given Playwright page.
 */
export function getPageCursor(page: Page): CursorInstance {
  let cursor = cursorMap.get(page);
  if (!cursor) {
    cursor = createCursor(page);
    cursorMap.set(page, cursor);
  }
  return cursor;
}

/**
 * Perform a human-like click on an ElementHandle or selector with fallback.
 */
export async function humanClick(
  page: Page,
  target: ElementHandle | string
): Promise<void> {
  if (!target) return;

  try {
    const cursor = getPageCursor(page);
    await cursor.click(target as any);
  } catch (err) {
    // Graceful fallback to native Playwright click if Bézier path calculation is obstructed
    try {
      if (typeof target === "string") {
        await page.click(target);
      } else {
        await target.click();
      }
    } catch {
      // Element might be detached or clicked via JS evaluation
    }
  }
}
