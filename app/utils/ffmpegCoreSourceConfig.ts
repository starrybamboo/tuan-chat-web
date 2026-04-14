const FFMPEG_CORE_VERSION = "0.12.9";

const DEFAULT_FFMPEG_CORE_BASE_URLS = [
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`,
  `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`,
] as const;

function splitUrlCandidates(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeFfmpegCoreBaseUrl(url: string): string {
  return url
    .trim()
    .replace(/\/+$/, "")
    // @ffmpeg/ffmpeg 0.12.x 在 module worker 里会对 coreURL 走动态 import。
    // 这里如果继续喂 /dist/umd，worker 会把 UMD 文件当 ESM 导入，稳定触发
    // "failed to import ffmpeg-core.js"。因此统一规范到 /dist/esm。
    .replace(/\/dist\/umd$/i, "/dist/esm");
}

export function getFfmpegCoreBaseUrlCandidates(env: Record<string, unknown> = ((import.meta as any).env ?? {})): string[] {
  const fromEnv = typeof env.VITE_FFMPEG_CORE_BASE_URL === "string" ? env.VITE_FFMPEG_CORE_BASE_URL.trim() : "";
  const envCandidates = fromEnv
    ? splitUrlCandidates(fromEnv).map(normalizeFfmpegCoreBaseUrl)
    : [];
  const useDefaultCdnFallback = typeof env.VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK === "string"
    ? env.VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK.toLowerCase() === "true"
    : env.VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK === true;
  const defaultCandidates = useDefaultCdnFallback
    ? DEFAULT_FFMPEG_CORE_BASE_URLS.map(normalizeFfmpegCoreBaseUrl)
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
