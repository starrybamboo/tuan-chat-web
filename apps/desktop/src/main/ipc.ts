import type { App, BrowserWindow, IpcMain } from "electron";

import path from "node:path";

import type { RendererLoaderState } from "./rendererLoader";

import { ELECTRON_IPC_CHANNELS } from "../common/ipc";
import { writeAiImageDebugBundle } from "./services/debugBundle";
import { showDesktopNotification } from "./services/desktopNotification";
import { generateNovelAiImage, getNovelAiClientSettings } from "./services/novelai";
import { registerWebGalIpc } from "./services/webgal";

export function registerDesktopIpc({
  app,
  ipcMain,
  getMainWindow,
  rendererState,
}: {
  app: App;
  ipcMain: IpcMain;
  getMainWindow: () => BrowserWindow | null;
  rendererState: RendererLoaderState;
}) {
  ipcMain.handle(ELECTRON_IPC_CHANNELS.getDevServerUrl, () => rendererState.resolvedDevServerUrl);
  ipcMain.handle(ELECTRON_IPC_CHANNELS.getDevPort, () => {
    try {
      if (!rendererState.resolvedDevServerUrl)
        return "";
      return new URL(rendererState.resolvedDevServerUrl).port || "";
    }
    catch {
      return "";
    }
  });
  ipcMain.handle(ELECTRON_IPC_CHANNELS.showDesktopNotification, (_event, payload) => {
    return showDesktopNotification(payload, getMainWindow);
  });
  ipcMain.handle(ELECTRON_IPC_CHANNELS.novelaiGetClientSettings, (_event, req) => getNovelAiClientSettings(req));
  ipcMain.handle(ELECTRON_IPC_CHANNELS.novelaiGenerateImage, (_event, req) => generateNovelAiImage(req));
  ipcMain.handle(ELECTRON_IPC_CHANNELS.saveAiImageDebugBundle, async (_event, payload) => {
    try {
      const directory = writeAiImageDebugBundle(
        path.join(app.getAppPath(), ".logs", "ai-image-debug"),
        payload,
      );
      return {
        ok: true,
        directory,
      };
    }
    catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  registerWebGalIpc({ ipcMain, app });
}
