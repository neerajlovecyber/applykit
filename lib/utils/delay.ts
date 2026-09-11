/**
 * Human-like delay utilities for anti-detection in browser automation.
 * Inspired by autoapplycv's character-by-character typing and LinkedIn bot's randomized delays.
 */

/**
 * Sleep for a specified duration with optional AbortSignal support.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new Error("Operation cancelled by user"));
  if (process.env.NODE_ENV === "test") return Promise.resolve();

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    const onAbort = () => {
      if (timer) clearTimeout(timer);
      reject(new Error("Operation cancelled by user"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      resolve();
    }, ms);
  });
}

/**
 * Sleep for a random duration between min and max milliseconds.
 */
export function randomDelay(minMs: number, maxMs: number, signal?: AbortSignal): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return sleep(delay, signal);
}

/**
 * Delay between keystrokes (50-150ms) to mimic human typing.
 */
export function keystrokeDelay(): Promise<void> {
  return randomDelay(50, 150);
}

/**
 * Delay between form field interactions (300-800ms).
 */
export function fieldDelay(): Promise<void> {
  return randomDelay(300, 800);
}

/**
 * Delay between page actions (1-3 seconds).
 */
export function actionDelay(): Promise<void> {
  return randomDelay(1000, 3000);
}

/**
 * Delay between job applications (5-15 seconds).
 */
export function applicationDelay(): Promise<void> {
  return randomDelay(5000, 15000);
}

/**
 * Delay before submitting (2-5 seconds) — simulates reading/reviewing.
 */
export function preSubmitDelay(): Promise<void> {
  return randomDelay(2000, 5000);
}

/**
 * Generate a jittered interval for polling operations.
 * Adds ±20% jitter to prevent synchronized requests.
 */
export function jitteredInterval(baseMs: number): number {
  const jitter = baseMs * 0.2;
  return baseMs + (Math.random() * 2 - 1) * jitter;
}
