import type { TuanChatElectronAPI } from "@tuanchat/electron-ipc";

import { contextBridge, ipcRenderer } from "electron";

import { ELECTRON_IPC_CHANNELS } from "../common/ipc";

const electronAPI: TuanChatElectronAPI = {
  launchWebGAL: payload => ipcRenderer.invoke(ELECTRON_IPC_CHANNELS.launchWebGAL, payload),
  getDevServerUrl: () => ipcRenderer.invoke(ELECTRON_IPC_CHANNELS.getDevServerUrl),
  getDevPort: () => ipcRenderer.invoke(ELECTRON_IPC_CHANNELS.getDevPort),
  novelaiGetClientSettings: payload => ipcRenderer.invoke(ELECTRON_IPC_CHANNELS.novelaiGetClientSettings, payload),
  novelaiGenerateImage: payload => ipcRenderer.invoke(ELECTRON_IPC_CHANNELS.novelaiGenerateImage, payload),
  saveAiImageDebugBundle: payload => ipcRenderer.invoke(ELECTRON_IPC_CHANNELS.saveAiImageDebugBundle, payload),
  showDesktopNotification: payload => ipcRenderer.invoke(ELECTRON_IPC_CHANNELS.showDesktopNotification, payload),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
