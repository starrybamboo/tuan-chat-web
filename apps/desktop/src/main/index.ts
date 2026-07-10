/* eslint-disable no-console, node/no-process-env */
import { app, BrowserWindow as ElectronBrowserWindow, dialog, ipcMain, protocol, type BrowserWindow, type MessageBoxOptions } from "electron";
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

// 记录最近一次检测到的新版本号，用于下载完成提示中明确更新对象。
let pendingUpdateVersion = "";
autoUpdater.on("update-available", (info) => {
  pendingUpdateVersion = info.version;
  console.warn("发现新版本:", info.version);
});
autoUpdater.on("download-progress", p => console.warn(`下载进度: ${Math.round(p.percent)}%`));
// 下载完成后让用户选择立即重启或稍后；选择稍后时不调用 quitAndInstall，
// 已下载的更新会在下次启动时由 electron-updater 自动安装。
autoUpdater.on("update-downloaded", async () => {
  const result = await dialog.showMessageBox({
    type: "info",
    title: "更新已下载",
    message: pendingUpdateVersion ? `新版本 ${pendingUpdateVersion} 已下载` : "新版本已下载",
    detail: "立即重启以完成安装；选择“稍后”时，会在下次启动时自动安装。",
    buttons: ["立即重启", "稍后"],
    defaultId: 0,
    cancelId: 1,
  });
  if (result.response === 0) {
    autoUpdater.quitAndInstall();
  }
});
autoUpdater.on("error", (err) => {
  console.error("[autoUpdater] error", err);
});

// 启动时静默检查更新；主动菜单入口由 handleCheckForUpdates 提供可见反馈。
function checkForUpdatesQuietly() {
  autoUpdater.autoDownload = true;
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error("[autoUpdater] checkForUpdatesAndNotify failed", err);
  });
}

function showMainMessageBox(options: MessageBoxOptions) {
  const owner = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  return owner ? dialog.showMessageBox(owner, options) : dialog.showMessageBox(options);
}

async function handleCheckForUpdates() {
  const canCheckUpdates = app.isPackaged || process.env.FORCE_AUTO_UPDATE === "1";
  if (!canCheckUpdates) {
    await showMainMessageBox({
      type: "info",
      title: "检查更新",
      message: "开发环境不会自动检查更新",
      detail: "打包版本会从 tuan.chat 更新源检查新版本。",
    });
    return;
  }

  autoUpdater.autoDownload = true;

  try {
    const result = await autoUpdater.checkForUpdatesAndNotify();
    const version = result?.updateInfo?.version;
    await showMainMessageBox({
      type: "info",
      title: "检查更新",
      message: version ? `正在下载新版本 ${version}` : "当前已是最新版本",
      detail: version ? "下载完成后会提示是否立即重启。" : "稍后也可以从帮助菜单再次检查。",
    });
  }
  catch (err) {
    console.error("[autoUpdater] checkForUpdatesAndNotify failed", err);
    await showMainMessageBox({
      type: "error",
      title: "检查更新失败",
      message: "暂时无法检查更新",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

app.whenReady().then(async () => {
  const shouldCheckUpdates = app.isPackaged || process.env.FORCE_AUTO_UPDATE === "1";
  if (shouldCheckUpdates) {
    checkForUpdatesQuietly();
  }

  registerDesktopIpc({
    app,
    ipcMain,
    getMainWindow: () => mainWindow,
    rendererState,
  });
  registerRendererFileProtocol(protocol, getRendererRoot(app));

  mainWindow = await createMainWindow(app, rendererState, { onCheckForUpdates: () => void handleCheckForUpdates() });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  app.on("activate", () => {
    if (ElectronBrowserWindow.getAllWindows().length === 0) {
      void createMainWindow(app, rendererState, { onCheckForUpdates: () => void handleCheckForUpdates() }).then((window) => {
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
