const FFMPEG_CORE_VERSION = "0.12.9";

const DEFAULT_FFMPEG_CORE_BASE_URLS = [
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`,
  `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`,
] as const;

function splitUrlCandidates(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function getFfmpegCoreBaseUrlCandidates(env: Record<string, unknown> = ((import.meta as any).env ?? {})): string[] {
  const fromEnv = typeof env.VITE_FFMPEG_CORE_BASE_URL === "string" ? env.VITE_FFMPEG_CORE_BASE_URL.trim() : "";
  const envCandidates = fromEnv
    ? splitUrlCandidates(fromEnv).map(url => url.replace(/\/+$/, ""))
    : [];
  const useDefaultCdnFallback = typeof env.VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK === "string"
    ? env.VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK.toLowerCase() === "true"
    : env.VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK === true;
  const defaultCandidates = useDefaultCdnFallback
    ? DEFAULT_FFMPEG_CORE_BASE_URLS.map(url => url.replace(/\/+$/, ""))
    : [];

  return Array.from(new Set([...envCandidates, ...defaultCandidates]));
}

export function shouldUseBundledFfmpegCore(env: Record<string, unknown> = ((import.meta as any).env ?? {})): boolean {
  const skipBundled = typeof env.VITE_FFMPEG_CORE_SKIP_BUNDLED === "string"
    ? env.VITE_FFMPEG_CORE_SKIP_BUNDLED.toLowerCase() === "true"
    : env.VITE_FFMPEG_CORE_SKIP_BUNDLED === true;
  return !skipBundled;
}

export function getFfmpegWrapperUrlCandidates(env: Record<string, unknown> = ((import.meta as any).env ?? {})): string[] {
  const fromEnv = typeof env.VITE_FFMPEG_WRAPPER_URL === "string" ? env.VITE_FFMPEG_WRAPPER_URL.trim() : "";
  if (!fromEnv) {
    return [];
  }
  return splitUrlCandidates(fromEnv);
}
