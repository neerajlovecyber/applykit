/**
 * Automation Worker — Sidecar Process for Playwright
 *
 * Runs as an independent Electron utilityProcess.
 * All Playwright automation, browser launching, and page interactions happen here,
 * completely isolated from Electron's Main Process and UI event loop.
 */

import { createStealthPage, closeBrowserPool } from "@/lib/execution/browser-pool";

export interface WorkerMessage<T = unknown> {
  id: string;
  type: "PING" | "EXECUTE_TASK" | "CONNECT_PLATFORM" | "CLOSE_POOL";
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

    case "CONNECT_PLATFORM": {
      try {
        sendResponse({
          id,
          type: "PROGRESS",
          data: { stage: "launching_browser", message: "Launching stealth browser..." },
        });

        const page = await createStealthPage({ headless: false });
        const { platform } = (payload as { platform?: string }) || {};

        let targetUrl = "https://www.linkedin.com/login";
        if (platform === "naukri") {
          targetUrl = "https://www.naukri.com/nlogin/login";
        }

        await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

        sendResponse({
          id,
          type: "SUCCESS",
          data: { connected: true, url: page.url() },
        });
      } catch (err) {
        sendResponse({ id, type: "ERROR", error: (err as Error).message });
      }
      break;
    }

    case "EXECUTE_TASK": {
      try {
        sendResponse({
          id,
          type: "PROGRESS",
          data: { stage: "starting", message: "Executing automation task in sidecar worker..." },
        });

        // Task execution payload handler
        sendResponse({
          id,
          type: "SUCCESS",
          data: { executed: true, result: payload },
        });
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
