import { BrowserWindow, Menu, type App } from "electron";
import path from "node:path";

import { loadRenderer, type RendererLoaderState } from "./rendererLoader";

function toggleDevTools(mainWindow: BrowserWindow) {
  const { webContents } = mainWindow;
  if (webContents.isDevToolsOpened()) {
    webContents.closeDevTools();
    return;
  }
  webContents.openDevTools({ mode: "detach" });
}

export async function createMainWindow(app: App, rendererState: RendererLoaderState) {
  const preloadPath = path.join(app.getAppPath(), "electron", "preload", "index.cjs");
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: preloadPath,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.webContents.on("before-input-event", (event, input) => {
    const key = String(input.key || "").toLowerCase();
    const isF12 = key === "f12";
    const isCtrlShiftI = key === "i" && input.control && input.shift;
    const isCmdShiftI = key === "i" && input.meta && input.shift;

    if (!isF12 && !isCtrlShiftI && !isCmdShiftI) {
      return;
    }

    event.preventDefault();
    toggleDevTools(mainWindow);
  });

  await loadRenderer(app, mainWindow, rendererState);
  return mainWindow;
}
