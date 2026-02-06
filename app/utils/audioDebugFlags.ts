export function isAudioUploadDebugEnabled(): boolean {
  const env = import.meta.env as any;
  const envFlag = typeof env?.VITE_AUDIO_UPLOAD_DEBUG === "string"
    ? ["1", "true", "yes", "on"].includes(env.VITE_AUDIO_UPLOAD_DEBUG.toLowerCase())
    : env?.VITE_AUDIO_UPLOAD_DEBUG === true;
  if (envFlag)
    return true;

  try {
    const g = globalThis as any;
    if (g?.__TC_AUDIO_UPLOAD_DEBUG === true)
      return true;
  }
  catch {
    // ignore
  }

  try {
    if (typeof localStorage === "undefined")
      return false;
    return localStorage.getItem("tc:audio:upload:debug") === "1";
  }
  catch {
    return false;
  }

  // In production we keep debug disabled unless explicitly enabled by env/global/localStorage.
  if (!env?.DEV)
    return false;

  return false;
}
