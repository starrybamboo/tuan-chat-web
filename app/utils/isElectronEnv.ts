/**
 * 是否是electron环境
 */
export function isElectronEnv() {
  return !!window?.electronAPI;
}
