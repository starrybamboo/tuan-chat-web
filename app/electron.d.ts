/* eslint-disable */
// This declares a global interface for the electronAPI
export type IElectronAPI = {
  launchWebGAL: () => void;
  novelaiGetClientSettings: (payload: {
    token: string;
    endpoint?: string;
  }) => Promise<any>;
  novelaiGenerateImage: (payload: {
    token: string;
    endpoint?: string;
    mode?: "txt2img" | "img2img";
    sourceImageBase64?: string;
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
  }) => Promise<{
    dataUrl: string;
    seed: number;
    width: number;
    height: number;
    model: string;
  }>;
};

// This extends the global Window interface
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
