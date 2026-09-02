import { app, BrowserWindow } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import log from "electron-log/main";
import { createAppWindow } from "./app";
import { registerDefaultTaskHandlers } from "@/lib/engine/task-handlers";
import { startTaskQueue, stopTaskQueue } from "@/lib/engine/task-queue";

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

  // Register execution task handlers & start task queue engine
  registerDefaultTaskHandlers();
  startTaskQueue(3000);

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

app.on("window-all-closed", () => {
  stopTaskQueue();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
