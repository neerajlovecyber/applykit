/**
 * Automation Worker — Sidecar Process for Playwright
 *
 * Runs as an independent Electron utilityProcess.
 * All Playwright automation, browser launching, and page interactions happen here,
 * completely isolated from Electron's Main Process and UI event loop.
 */

import { createStealthPage, closeBrowserPool } from "@/lib/execution/browser-pool";

import { FormAutomationEngine } from "@/lib/execution/engine";
import type { ApplicationExecuteOptions } from "@/lib/execution/types";

const formEngine = new FormAutomationEngine();

export interface WorkerMessage<T = unknown> {
  id: string;
  type: "PING" | "EXECUTE_TASK" | "CONNECT_PLATFORM" | "LAUNCH_BROWSER" | "CLOSE_POOL";
  payload?: T;
}

export interface WorkerResponse<T = unknown> {
  id: string;
  type: "SUCCESS" | "PROGRESS" | "ERROR" | "PONG";
  data?: T;
  error?: string;
}

function sendResponse(response: WorkerResponse): void {
  if (process.parentPort) {
    process.parentPort.postMessage(response);
  } else if (process.send) {
    process.send(response);
  }
}

async function handleMessage(msg: WorkerMessage): Promise<void> {
  const { id, type, payload } = msg;

  switch (type) {
    case "PING": {
      sendResponse({ id, type: "PONG", data: { pid: process.pid, uptime: process.uptime() } });
      break;
    }

    case "CLOSE_POOL": {
      try {
        await closeBrowserPool();
        sendResponse({ id, type: "SUCCESS", data: { closed: true } });
      } catch (err) {
        sendResponse({ id, type: "ERROR", error: (err as Error).message });
      }
      break;
    }

    case "LAUNCH_BROWSER": {
      try {
        const { url, cookies } = (payload as { url?: string; cookies?: any[] }) || {};
        const page = await createStealthPage({ headless: false });
        if (cookies && cookies.length > 0) {
          try {
            await page.context().addCookies(cookies);
          } catch (cErr) {
            console.warn("[AutomationWorker] Could not set cookies:", cErr);
          }
        }
        if (url) {
          await page.goto(url, { waitUntil: "domcontentloaded" });
        }
        sendResponse({ id, type: "SUCCESS", data: { launched: true, url: page.url() } });
      } catch (err) {
        sendResponse({ id, type: "ERROR", error: (err as Error).message });
      }
      break;
    }

    case "CONNECT_PLATFORM": {
      let page: any = null;
      try {
        sendResponse({
          id,
          type: "PROGRESS",
          data: { stage: "launching_browser", message: "Launching stealth browser for authentication..." },
        });

        page = await createStealthPage({ headless: false });
        const { platform, timeoutMs = 300000 } = (payload as { platform?: string; timeoutMs?: number }) || {};

        let targetUrl = "https://www.linkedin.com/login";
        if (platform === "naukri") {
          targetUrl = "https://www.naukri.com/nlogin/login";
        }

        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

        const deadline = Date.now() + timeoutMs;
        let lastReport = 0;

        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 2000));
          const currentUrl: string = page.url();

          if (platform === "naukri") {
            const cookies = await page.context().cookies("https://www.naukri.com");
            const naukAt = cookies.find((c: any) => c.name === "nauk_at");
            if (
              currentUrl.includes("naukri.com/mnjuser/homepage") ||
              currentUrl.includes("naukri.com/my-naukri") ||
              currentUrl.includes("naukri.com/naukri") ||
              naukAt?.value
            ) {
              console.log("[AutomationWorker] Naukri login confirmed:", currentUrl);
              sendResponse({
                id,
                type: "SUCCESS",
                data: {
                  connected: true,
                  platform: "naukri",
                  url: currentUrl,
                  authToken: naukAt?.value,
                  cookies,
                },
              });
              return;
            }
          } else if (platform === "linkedin") {
            const cookies = await page.context().cookies("https://www.linkedin.com");
            const liAt = cookies.find((c: any) => c.name === "li_at");
            if (
              currentUrl.includes("linkedin.com/feed") ||
              currentUrl.includes("linkedin.com/mynetwork") ||
              currentUrl.includes("linkedin.com/jobs") ||
              currentUrl.includes("linkedin.com/in/") ||
              liAt?.value
            ) {
              console.log("[AutomationWorker] LinkedIn login confirmed:", currentUrl);
              sendResponse({
                id,
                type: "SUCCESS",
                data: {
                  connected: true,
                  platform: "linkedin",
                  url: currentUrl,
                  authToken: liAt?.value,
                  cookies,
                },
              });
              return;
            }
          }

          if (Date.now() - lastReport > 10000) {
            lastReport = Date.now();
            sendResponse({
              id,
              type: "PROGRESS",
              data: { stage: "waiting_for_user", message: "Waiting for login or verification...", url: currentUrl },
            });
          }
        }

        sendResponse({
          id,
          type: "ERROR",
          error: `Login timeout (${timeoutMs / 1000}s) — please try connecting again.`,
        });
      } catch (err) {
        sendResponse({ id, type: "ERROR", error: (err as Error).message });
      }
      break;
    }

    case "EXECUTE_TASK": {
      try {
        const { taskKind, executeOptions } = (payload as {
          taskKind?: string;
          executeOptions?: ApplicationExecuteOptions;
        }) || {};

        if (taskKind === "apply" && executeOptions) {
          sendResponse({
            id,
            type: "PROGRESS",
            data: { stage: "launching_browser", message: `Launching browser for ${executeOptions.platform}...` },
          });

          const page = await createStealthPage({ headless: false });
          try {
            const result = await formEngine.execute(page, executeOptions.platform, executeOptions);
            sendResponse({
              id,
              type: "SUCCESS",
              data: result,
            });
          } finally {
            await page.close().catch(() => {});
          }
        } else {
          sendResponse({
            id,
            type: "SUCCESS",
            data: { executed: true, result: payload },
          });
        }
      } catch (err) {
        sendResponse({ id, type: "ERROR", error: (err as Error).message });
      }
      break;
    }

    default: {
      sendResponse({ id, type: "ERROR", error: `Unknown worker message type: ${type}` });
      break;
    }
  }
}

// Attach listener to Electron parentPort or standard child_process IPC
if (process.parentPort) {
  process.parentPort.on("message", (event: { data: WorkerMessage }) => {
    handleMessage(event.data).catch((err) => {
      console.error("[AutomationWorker] Unhandled rejection:", err);
    });
  });
} else if (process.on) {
  process.on("message", (msg: WorkerMessage) => {
    handleMessage(msg).catch((err) => {
      console.error("[AutomationWorker] Unhandled message error:", err);
    });
  });
}

// Global safety guards to prevent silent crashes
process.on("uncaughtException", (err) => {
  console.error("[AutomationWorker] Fatal uncaughtException:", err);
  sendResponse({ id: "FATAL", type: "ERROR", error: err.message });
});

process.on("unhandledRejection", (reason) => {
  console.error("[AutomationWorker] Fatal unhandledRejection:", reason);
});
