/* eslint-disable */
// This declares a global interface for the electronAPI
export type IElectronAPI = {
  launchWebGAL: () => void;
  novelaiGenerateImage: (payload: {
    token: string;
    endpoint?: string;
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
