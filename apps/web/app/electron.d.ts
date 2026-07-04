import type { TuanChatElectronAPI } from "@tuanchat/electron-ipc";

export type IElectronAPI = TuanChatElectronAPI;

declare global {
  // oxlint-disable-next-line typescript-eslint/consistent-type-definitions -- declaration merging 需 interface
  interface Window {
    electronAPI: IElectronAPI;
  }
}
