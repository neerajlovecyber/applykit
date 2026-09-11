import { app, BrowserWindow } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import log from "electron-log/main";
import { createAppWindow } from "./app";
import { registerDefaultTaskHandlers } from "@/lib/engine/task-handlers";
import { startTaskQueue, stopTaskQueue } from "@/lib/engine/task-queue";
import { recoverStaleTasks } from "@/lib/db";
import { workerManager } from "@/lib/execution/worker-manager";

// Initialize persistent file & console logger
log.initialize();
log.info("[ApplyKit] Starting up desktop process...");

// Catch global unhandled exceptions and log them
process.on("uncaughtException", (error) => {
  log.error("[ApplyKit UncaughtException]", error);
});
process.on("unhandledRejection", (reason) => {
  log.error("[ApplyKit UnhandledRejection]", reason);
});

// Initialization when Electron is ready
app.setName("ApplyKit");

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("io.github.neerajlovecyber.applykit");

  // 1. Recover any tasks left stuck in 'running' by previous crash or restart
  try {
    const recovered = recoverStaleTasks();
    if (recovered > 0) {
      log.info(`[ApplyKit] Recovered ${recovered} stale running tasks from prior session.`);
    }
  } catch (err) {
    log.warn("[ApplyKit] Could not recover stale tasks on startup:", err);
  }

  // 2. Register execution task handlers (queue remains idle until user starts it)
  registerDefaultTaskHandlers();

  // 3. Pre-warm isolated automation worker
  try {
    workerManager.ensureWorker();
  } catch (err) {
    log.warn("[ApplyKit] Worker pre-warm notice:", err);
  }

  // Create app window
  createAppWindow();

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAppWindow();
    }
  });
});

app.on("before-quit", () => {
  stopTaskQueue();
  workerManager.terminate().catch(() => {});
});

app.on("window-all-closed", () => {
  stopTaskQueue();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
