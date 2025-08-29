/* eslint-disable */
// This declares a global interface for the electronAPI
export type IElectronAPI = {
  launchWebGAL: () => void;
};

// This extends the global Window interface
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
