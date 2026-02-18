import type { AudioTranscodeOptions } from "@/utils/audioTranscodeUtils";

import { resolveFfmpegLoadTimeoutMs } from "@/utils/ffmpegLoadTimeoutConfig";

const AUDIO_UPLOAD_MAX_INPUT_BYTES = 30 * 1024 * 1024;
const AUDIO_UPLOAD_PREFER_SMALLER_MIN_BYTES = 48 * 1024;
// 线上/网关常见默认 client_max_body_size 为 1MB，这里预留一点头部与波动空间。
const AUDIO_UPLOAD_MAX_OUTPUT_BYTES = 960 * 1024;

function normalizeMaxDurationSec(maxDurationSec?: number): number | undefined {
  if (typeof maxDurationSec !== "number" || !Number.isFinite(maxDurationSec) || maxDurationSec <= 0)
    return undefined;
  return maxDurationSec;
}

/**
 * 音频上传统一输入体积保护：
 * 避免超大文件进入 ffmpeg wasm FS 导致内存/超时问题。
 */
export function assertAudioUploadInputSizeOrThrow(inputBytes: number): void {
  if (!Number.isFinite(inputBytes) || inputBytes <= AUDIO_UPLOAD_MAX_INPUT_BYTES)
    return;

  const mb = (inputBytes / 1024 / 1024).toFixed(1);
  const maxMb = Math.round(AUDIO_UPLOAD_MAX_INPUT_BYTES / 1024 / 1024);
  throw new Error(`音频文件过大（${mb}MB），已阻止上传（上限 ${maxMb}MB）`);
}

function resolveAudioTranscodeExecTimeoutMs(inputBytes: number, maxDurationSec?: number): number {
  const normalizedDuration = normalizeMaxDurationSec(maxDurationSec);
  if (normalizedDuration) {
    return Math.max(60_000, Math.min(240_000, Math.floor(normalizedDuration * 4_000)));
  }

  const safeInputBytes = Number.isFinite(inputBytes) && inputBytes > 0 ? inputBytes : 0;
  return Math.max(120_000, Math.min(600_000, Math.floor((safeInputBytes / 1024 / 1024) * 20_000)));
}

/**
 * 音频上传默认转码策略（Opus + WebM）：
 * - 统一码率/采样率
 * - 统一加载与执行超时
 * - 对足够大的输入启用“必须变小”约束
 */
export function buildDefaultAudioUploadTranscodeOptions(inputBytes: number, maxDurationSec?: number): AudioTranscodeOptions {
  const normalizedDuration = normalizeMaxDurationSec(maxDurationSec);
  const shouldEnforceSmaller = inputBytes >= AUDIO_UPLOAD_PREFER_SMALLER_MIN_BYTES;
  const preferSmallerThanBytes = shouldEnforceSmaller
    ? Math.min(inputBytes, AUDIO_UPLOAD_MAX_OUTPUT_BYTES)
    : undefined;
  return {
    maxDurationSec: normalizedDuration,
    loadTimeoutMs: resolveFfmpegLoadTimeoutMs(),
    execTimeoutMs: resolveAudioTranscodeExecTimeoutMs(inputBytes, normalizedDuration),
    bitrateKbps: 48,
    sampleRateHz: 32000,
    preferSmallerThanBytes,
  };
}
