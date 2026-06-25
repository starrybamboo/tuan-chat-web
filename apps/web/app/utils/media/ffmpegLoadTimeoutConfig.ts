// 默认不限制初始化时长，避免首轮下载 ffmpeg-core 较慢时误判失败。
const DEFAULT_FFMPEG_LOAD_TIMEOUT_MS = 0;

function normalizeTimeoutMs(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) {
      return undefined;
    }
    return Math.floor(raw);
  }

  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

/**
 * 统一解析 FFmpeg 初始化超时：
 * - 正数：超时毫秒数
 * - 0：禁用初始化超时
 */
export function resolveFfmpegLoadTimeoutMs(optionTimeoutMs?: number): number {
  const fromOption = normalizeTimeoutMs(optionTimeoutMs);
  if (typeof fromOption === "number") {
    return fromOption;
  }

  const env = import.meta.env as any;
  const fromEnv = normalizeTimeoutMs(env?.VITE_FFMPEG_LOAD_TIMEOUT_MS);
  if (typeof fromEnv === "number") {
    return fromEnv;
  }

  return DEFAULT_FFMPEG_LOAD_TIMEOUT_MS;
}
