import type { TuanChatElectronAPI } from "@tuanchat/electron-ipc";

export type IElectronAPI = TuanChatElectronAPI;

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
