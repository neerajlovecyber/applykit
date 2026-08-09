import { autoUpdater } from "electron-updater";
import { app, BrowserWindow } from "electron";

export function initAutoUpdater(mainWindow?: BrowserWindow): void {
  // Only check for updates in packaged production app
  if (!app.isPackaged) {
    console.log("[AutoUpdater] Skipped in development mode.");
    return;
  }

  // Enable pre-releases / alpha versions update checks
  autoUpdater.allowPrerelease = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on("checking-for-update", () => {
    console.log("[AutoUpdater] Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log(`[AutoUpdater] Update available: v${info.version}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("updater:update-available", info);
    }
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[AutoUpdater] Application is up to date.");
  });

  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] Error checking for updates:", err);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    console.log(`[AutoUpdater] Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent.toFixed(1)}%`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("updater:download-progress", progressObj);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`[AutoUpdater] Update v${info.version} downloaded. Ready to install on quit.`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("updater:update-downloaded", info);
    }
  });

  // Check for updates automatically on startup
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.error("[AutoUpdater] Failed to initiate update check:", err);
  }
}
