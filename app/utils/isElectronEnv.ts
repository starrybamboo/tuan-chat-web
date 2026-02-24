/**
 * 是否是electron环境
 */
export function isElectronEnv() {
  if (typeof window === "undefined")
    return false;

  if (window.electronAPI)
    return true;

  if (typeof navigator !== "undefined" && /\bElectron\//i.test(navigator.userAgent))
    return true;

  return false;
}
