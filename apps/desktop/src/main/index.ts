/* eslint-disable no-console, node/no-process-env */
import { app, BrowserWindow as ElectronBrowserWindow, ipcMain, protocol, type BrowserWindow } from "electron";
import electronUpdater from "electron-updater";
import path from "node:path";
import process from "node:process";

import { registerDesktopIpc } from "./ipc";
import { registerAppScheme, registerRendererFileProtocol } from "./protocol";
import { getRendererRoot } from "./rendererLoader";
import { stopWebGAL } from "./services/webgal";
import { createMainWindow } from "./window";

const { autoUpdater } = electronUpdater;

let mainWindow: BrowserWindow | null = null;
const rendererState = {
  resolvedDevServerUrl: "",
};

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
else {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized())
        mainWindow.restore();
      mainWindow.focus();
    }
  });
}

if (!app.isPackaged) {
  try {
    app.setPath("userData", path.join(app.getPath("userData"), "dev"));
  }
  catch {
    // ignore
  }
}

registerAppScheme(protocol);

autoUpdater.on("update-available", info => console.warn("发现新版本:", info.version));
autoUpdater.on("download-progress", p => console.warn(`下载进度: ${Math.round(p.percent)}%`));
autoUpdater.on("update-downloaded", () => autoUpdater.quitAndInstall());
autoUpdater.on("error", (err) => {
  console.error("[autoUpdater] error", err);
});

app.whenReady().then(async () => {
  const shouldCheckUpdates = app.isPackaged || process.env.FORCE_AUTO_UPDATE === "1";
  if (shouldCheckUpdates) {
    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error("[autoUpdater] checkForUpdatesAndNotify failed", err);
    });
  }

  registerDesktopIpc({
    app,
    ipcMain,
    getMainWindow: () => mainWindow,
    rendererState,
  });
  registerRendererFileProtocol(protocol, getRendererRoot(app));

  mainWindow = await createMainWindow(app, rendererState);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  app.on("activate", () => {
    if (ElectronBrowserWindow.getAllWindows().length === 0) {
      void createMainWindow(app, rendererState).then((window) => {
        mainWindow = window;
        mainWindow.on("closed", () => {
          mainWindow = null;
        });
      });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    app.quit();
});

app.on("will-quit", () => {
  stopWebGAL();
});
