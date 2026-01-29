export function isAudioUploadDebugEnabled(): boolean {
  if (!(import.meta as any)?.env?.DEV)
    return false;

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
}
