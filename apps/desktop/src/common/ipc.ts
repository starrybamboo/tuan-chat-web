export type {
  AiImageDebugBundleRequest,
  AiImageDebugBundleResult,
  DesktopNotificationRequest,
  DesktopNotificationResult,
  NovelAiClientSettingsRequest,
  NovelAiGenerateImageRequest,
  NovelAiGenerateImageResult,
  TuanChatElectronAPI,
  WebGALLaunchRequest,
  WebGALLaunchResult,
} from "@tuanchat/electron-ipc";

export const ELECTRON_IPC_CHANNELS = {
  launchWebGAL: "launch-webgal",
  getDevServerUrl: "electron:get-dev-server-url",
  getDevPort: "electron:get-dev-port",
  showDesktopNotification: "electron:show-desktop-notification",
  novelaiGetClientSettings: "novelai:get-clientsettings",
  novelaiGenerateImage: "novelai:generate-image",
  saveAiImageDebugBundle: "ai-image:save-debug-bundle",
} as const;
