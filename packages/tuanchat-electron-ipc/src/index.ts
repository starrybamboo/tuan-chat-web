export const ELECTRON_IPC_CHANNELS = {
  launchWebGAL: "launch-webgal",
  getDevServerUrl: "electron:get-dev-server-url",
  getDevPort: "electron:get-dev-port",
  showDesktopNotification: "electron:show-desktop-notification",
  novelaiGetClientSettings: "novelai:get-clientsettings",
  novelaiGenerateImage: "novelai:generate-image",
  saveAiImageDebugBundle: "ai-image:save-debug-bundle",
} as const;

export type WebGALLaunchRequest = {
  gameDir?: string;
};

export type WebGALLaunchResult = {
  ok: boolean;
  port?: number;
  error?: string;
  openedUrl?: string;
};

export type NovelAiClientSettingsRequest = {
  token: string;
  endpoint?: string;
};

export type NovelAiV4CharacterPrompt = {
  centerX?: number;
  centerY?: number;
  prompt?: string;
  negativePrompt?: string;
};

export type NovelAiGenerateImageRequest = {
  token: string;
  endpoint?: string;
  mode?: "txt2img" | "img2img" | "infill";
  sourceImageBase64?: string;
  maskBase64?: string;
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  scale?: number;
  sampler?: string;
  noiseSchedule?: string;
  cfgRescale?: number;
  smea?: boolean;
  smeaDyn?: boolean;
  qualityToggle?: boolean;
  strength?: number;
  noise?: number;
  seed?: number;
  v4Chars?: NovelAiV4CharacterPrompt[];
  v4UseCoords?: boolean;
  v4UseOrder?: boolean;
};

export type NovelAiGenerateImageResult = {
  dataUrl: string;
  seed: number;
  width: number;
  height: number;
  model: string;
};

export type AiImageDebugBundleRequest = {
  category: "infill";
  sourceDataUrl?: string;
  uiMaskDataUrl?: string;
  requestMaskDataUrl?: string;
  requestBody: Record<string, unknown>;
};

export type AiImageDebugBundleResult = {
  ok: boolean;
  directory?: string;
  error?: string;
};

export type DesktopNotificationRequest = {
  title: string;
  body: string;
  icon?: string;
  targetPath?: string;
  tag?: string;
  silent?: boolean;
};

export type DesktopNotificationResult = {
  ok: boolean;
  reason?: string;
};

/**
 * 渲染进程可见的桌面端能力面。
 */
export type TuanChatElectronAPI = {
  launchWebGAL: (payload?: WebGALLaunchRequest) => Promise<WebGALLaunchResult>;
  getDevServerUrl: () => Promise<string>;
  getDevPort: () => Promise<string>;
  novelaiGetClientSettings: (payload: NovelAiClientSettingsRequest) => Promise<unknown>;
  novelaiGenerateImage: (payload: NovelAiGenerateImageRequest) => Promise<NovelAiGenerateImageResult>;
  saveAiImageDebugBundle: (payload: AiImageDebugBundleRequest) => Promise<AiImageDebugBundleResult>;
  showDesktopNotification: (payload: DesktopNotificationRequest) => Promise<DesktopNotificationResult>;
};
