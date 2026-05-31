import { describe, expect, it } from "vitest";

import {
  getFfmpegCoreBaseUrlCandidates,
  getFfmpegWrapperUrlCandidates,
} from "./ffmpegCoreSourceConfig";

describe("ffmpegCoreSourceConfig", () => {
  it("能解析多候选 core base url、去重并把旧的 UMD 配置规范到 ESM", () => {
    const candidates = getFfmpegCoreBaseUrlCandidates({
      VITE_FFMPEG_CORE_BASE_URL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/umd, https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd,https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/umd",
    });

    expect(candidates).toEqual([
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/esm",
      "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm",
    ]);
  });

  it("能解析多候选 wrapper url", () => {
    const candidates = getFfmpegWrapperUrlCandidates({
      VITE_FFMPEG_WRAPPER_URL: "https://cdn1.example/ffmpeg/index.js; https://cdn2.example/ffmpeg/index.js",
    });

    expect(candidates).toEqual([
      "https://cdn1.example/ffmpeg/index.js",
      "https://cdn2.example/ffmpeg/index.js",
    ]);
  });

  it("默认 CDN fallback 也会返回 ESM core 基址", () => {
    const candidates = getFfmpegCoreBaseUrlCandidates({
      VITE_FFMPEG_CORE_USE_DEFAULT_CDN_FALLBACK: "true",
    });

    expect(candidates).toEqual([
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/esm",
      "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm",
    ]);
  });

  it("未配置 core base url 时默认使用远程 ESM core，避免把 wasm 打进静态产物", () => {
    const candidates = getFfmpegCoreBaseUrlCandidates({});

    expect(candidates).toEqual([
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/esm",
      "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm",
    ]);
  });
});
