import { app, BrowserWindow } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { createAppWindow } from "./app";
import { registerExecutionTaskHandlers } from "@/lib/execution/executor";
import { startTaskQueue, stopTaskQueue } from "@/lib/engine/task-queue";

// Initialization when Electron is ready
app.setName("ApplyKit");

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("io.github.neerajlovecyber.applykit");

  // Register execution task handlers & start task queue engine
  registerExecutionTaskHandlers();
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
