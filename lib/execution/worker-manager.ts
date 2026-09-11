/**
 * Playwright Worker Manager — Electron utilityProcess Supervisor
 *
 * Manages the lifecycle of the isolated automation worker process.
 * Provides resilient request-response messaging, timeout guards,
 * and automatic crash recovery.
 */

import { randomUUID } from "crypto";
import path from "path";
import type { WorkerMessage, WorkerResponse } from "@/lib/workers/automation-worker";

interface PendingRequest<T = unknown> {
  type: WorkerMessage["type"];
  timeoutMs: number;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

export class AutomationWorkerManager {
  private childProcess: any = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private isShuttingDown = false;
  private workerPath: string;
  // Concurrency mutex: ensures strictly ONE automation task executes in the browser at a time
  private executionQueue: Promise<any> = Promise.resolve();
  // Active AbortController for current task execution
  private activeAbortController: AbortController | null = null;

  constructor(customWorkerPath?: string) {
    this.workerPath =
      customWorkerPath ||
      path.join(__dirname, "automation-worker.js");
  }

  /**
   * Spawns or returns the active utilityProcess worker.
   */
  public ensureWorker(): any {
    if (this.childProcess) return this.childProcess;

    try {
      // Dynamically load Electron utilityProcess to allow non-Electron testing
      const { utilityProcess } = require("electron");

      if (!utilityProcess || typeof utilityProcess.fork !== "function") {
        console.warn("[WorkerManager] utilityProcess not available in current environment. Using mock/in-process.");
        return null;
      }

      console.log(`[WorkerManager] Spawning Playwright utilityProcess worker at: ${this.workerPath}`);
      let dbPath: string | undefined;
      try {
        const { resolveDbPath } = require("@/lib/db/connection");
        dbPath = resolveDbPath();
      } catch {}

      this.childProcess = utilityProcess.fork(this.workerPath, [], {
        env: {
          ...process.env,
          ...(dbPath ? { APPLYKIT_DB_PATH: dbPath } : {}),
        },
      });

      this.childProcess.on("message", (response: WorkerResponse) => {
        this.handleWorkerResponse(response);
      });

      this.childProcess.on("exit", (code: number) => {
        console.warn(`[WorkerManager] Automation worker exited with code: ${code}`);
        this.childProcess = null;

        // Reject all pending requests if worker crashed
        if (!this.isShuttingDown) {
          for (const [id, req] of this.pendingRequests.entries()) {
            clearTimeout(req.timer);
            req.reject(new Error(`Automation worker terminated unexpectedly with code ${code}`));
            this.pendingRequests.delete(id);
          }
        }
      });

      return this.childProcess;
    } catch (err) {
      console.warn("[WorkerManager] Could not spawn utilityProcess (likely outside Electron runtime):", err);
      return null;
    }
  }

  /**
   * Send a command to the worker with a timeout.
   */
  public async sendCommand<T = unknown, R = unknown>(
    type: WorkerMessage["type"],
    payload?: T,
    timeoutMs = 60000,
  ): Promise<R> {
    const worker = this.ensureWorker();
    const id = randomUUID();

    if (!worker) {
      // In-process fallback for tests / environments where utilityProcess is unavailable
      return this.handleFallbackCommand<T, R>(type, payload);
    }

    return new Promise<R>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Worker request [${type}] timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        type,
        timeoutMs,
        resolve: resolve as (val: unknown) => void,
        reject,
        timer,
      });

      const message: WorkerMessage<T> = { id, type, payload };
      worker.postMessage(message);
    });
  }

  private handleWorkerResponse(response: WorkerResponse): void {
    const { id, type, data, error } = response;
    const req = this.pendingRequests.get(id);
    if (!req) return;

    if (type === "PROGRESS") {
      // Intermediate progress update — don't resolve yet
      console.log(`[WorkerManager] Progress [${id}]:`, data);
      // Active progress heartbeat: refresh timeout window
      clearTimeout(req.timer);
      req.timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        req.reject(new Error(`Worker request [${req.type}] timed out waiting for next step`));
      }, req.timeoutMs);
      return;
    }

    clearTimeout(req.timer);
    this.pendingRequests.delete(id);

    if (type === "ERROR") {
      req.reject(new Error(error || "Worker operation failed"));
    } else {
      req.resolve(data);
    }
  }

  /**
   * Safe fallback for when utilityProcess is not running (e.g. unit tests outside Electron).
   */
  private async handleFallbackCommand<T, R>(type: WorkerMessage["type"], payload?: T): Promise<R> {
    if (type === "PING") {
      return { pid: process.pid, uptime: process.uptime(), fallback: true } as R;
    }
    if (type === "CLOSE_POOL") {
      return { closed: true, fallback: true } as R;
    }
    if (type === "CONNECT_PLATFORM") {
      const { platform } = (payload as any) || {};
      return { connected: true, platform, fallback: true } as R;
    }
    if (type === "LAUNCH_BROWSER") {
      const { url } = (payload as any) || {};
      return { launched: true, url, fallback: true } as R;
    }
    if (type === "BRING_TO_FRONT") {
      const { bringBrowserToFront } = require("./browser-pool");
      const success = await bringBrowserToFront();
      return { success, fallback: true } as R;
    }
    if (type === "GET_BROWSER_STATUS") {
      const { isBrowserOpen } = require("./browser-pool");
      return { open: isBrowserOpen(), fallback: true } as R;
    }
    if (type === "EXECUTE_TASK") {
      const { taskKind, executeOptions, options: searchOptions } = (payload as any) || {};
      if (taskKind === "apply" && executeOptions) {
        const { createStealthPage, releasePage } = require("./browser-pool");
        const { FormAutomationEngine } = require("./engine");
        const formEngine = new FormAutomationEngine();
        const isHeadless = executeOptions.headless ?? false;
        const page = await createStealthPage({ headless: isHeadless });
        try {
          const result = await formEngine.execute(page, executeOptions.platform, {
            ...executeOptions,
            signal: this.activeAbortController?.signal,
          });
          return result as R;
        } finally {
          await releasePage(page);
        }
      }
      if (taskKind === "discovery" && searchOptions) {
        const { createStealthPage, releasePage } = require("./browser-pool");
        const { getDiscoveryAdapter } = require("@/lib/jobs/adapters");
        const isHeadless = searchOptions.headless ?? false;
        const page = await createStealthPage({ headless: isHeadless });
        try {
          const adapter = getDiscoveryAdapter(searchOptions.source);
          if (!adapter) {
            throw new Error(`No discovery adapter found for platform: ${searchOptions.source}`);
          }
          const jobs = await adapter.scrape(page, searchOptions);
          return { jobs } as R;
        } finally {
          await releasePage(page);
        }
      }
    }
    return { executed: true, payload, fallback: true } as R;
  }

  /**
   * Health-check the worker.
   */
  public async ping(): Promise<{ pid: number; uptime: number }> {
    return this.sendCommand("PING");
  }

  /**
   * Connect platform account via isolated browser.
   */
  public async connectPlatform(platform: string, timeoutMs = 300000): Promise<any> {
    return this.sendCommand("CONNECT_PLATFORM", { platform, timeoutMs }, timeoutMs + 5000);
  }

  /**
   * Launch a browser instance via the isolated worker.
   */
  public async launchBrowser(url?: string, cookies?: any[]): Promise<any> {
    return this.sendCommand("LAUNCH_BROWSER", { url, cookies });
  }

  /**
   * Cancel the currently executing task immediately via its AbortController.
   */
  public cancelActiveTask(reason = "Cancelled by user"): void {
    if (this.activeAbortController) {
      console.log(`[WorkerManager] Aborting current task: ${reason}`);
      this.activeAbortController.abort(reason);
      this.activeAbortController = null;
    }
    // Also send abort command to worker process if running
    this.sendCommand("ABORT_TASK", { reason }).catch(() => {});
  }

  /**
   * Execute automation task via isolated worker (guaranteed strictly sequential - one task at a time).
   */
  public async executeTask<T = any, R = any>(
    task: T,
    timeoutMs = 180000,
    signal?: AbortSignal
  ): Promise<R> {
    const run = async () => {
      if (signal?.aborted) {
        throw new Error("Task cancelled before execution began");
      }

      const controller = new AbortController();
      this.activeAbortController = controller;

      // Link external signal if provided
      const onExternalAbort = () => {
        controller.abort("Cancelled by external signal");
      };
      if (signal) {
        signal.addEventListener("abort", onExternalAbort, { once: true });
      }

      try {
        const promise = this.sendCommand<T, R>("EXECUTE_TASK", task, timeoutMs);
        const abortPromise = new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error(String(controller.signal.reason || "Task cancelled by user")));
          }, { once: true });
        });

        return await Promise.race([promise, abortPromise]);
      } finally {
        if (signal) {
          signal.removeEventListener("abort", onExternalAbort);
        }
        if (this.activeAbortController === controller) {
          this.activeAbortController = null;
        }
      }
    };

    const queued = this.executionQueue.then(run, run);
    this.executionQueue = queued.catch(() => {});
    return queued;
  }

  /**
   * Execute discovery job scraping via isolated worker.
   */
  public async executeDiscovery(options: any, signal?: AbortSignal): Promise<any[]> {
    const res = await this.executeTask<any, { jobs?: any[] }>(
      {
        taskKind: "discovery",
        options,
      },
      180000,
      signal
    );
    return res?.jobs ?? [];
  }

  /**
   * Close the browser pool in the worker.
   */
  public async closePool(): Promise<void> {
    return this.sendCommand("CLOSE_POOL");
  }

  /**
   * Bring the automation browser window and active page to the front.
   */
  public async bringBrowserToFront(): Promise<boolean> {
    try {
      const res = await this.sendCommand<undefined, { success: boolean }>("BRING_TO_FRONT");
      return res?.success ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Check if automation browser is currently open.
   */
  public async getBrowserStatus(): Promise<{ open: boolean }> {
    try {
      const res = await this.sendCommand<undefined, { open: boolean }>("GET_BROWSER_STATUS");
      return res ?? { open: false };
    } catch {
      return { open: false };
    }
  }

  /**
   * Terminate the utility process completely.
   */
  public async terminate(): Promise<void> {
    this.isShuttingDown = true;
    if (this.childProcess) {
      try {
        await this.closePool().catch(() => {});
        this.childProcess.kill();
      } catch {
        // ignore
      }
      this.childProcess = null;
    }
    this.isShuttingDown = false;
  }
}

// Global singleton instance for the main process
export const workerManager = new AutomationWorkerManager();
