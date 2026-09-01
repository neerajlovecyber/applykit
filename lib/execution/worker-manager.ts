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
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

export class AutomationWorkerManager {
  private childProcess: any = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private isShuttingDown = false;
  private workerPath: string;

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
      this.childProcess = utilityProcess.fork(this.workerPath);

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
  public async connectPlatform(platform: string): Promise<any> {
    return this.sendCommand("CONNECT_PLATFORM", { platform });
  }

  /**
   * Execute automation task.
   */
  public async executeTask(task: unknown): Promise<any> {
    return this.sendCommand("EXECUTE_TASK", task);
  }

  /**
   * Close the browser pool in the worker.
   */
  public async closePool(): Promise<void> {
    return this.sendCommand("CLOSE_POOL");
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
