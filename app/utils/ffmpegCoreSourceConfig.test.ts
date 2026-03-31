import { describe, expect, it } from "vitest";

import {
  getFfmpegCoreBaseUrlCandidates,
  getFfmpegWrapperUrlCandidates,
  shouldUseBundledFfmpegCore,
} from "./ffmpegCoreSourceConfig";

describe("ffmpegCoreSourceConfig", () => {
  it("能解析多候选 core base url 并去重", () => {
    const candidates = getFfmpegCoreBaseUrlCandidates({
      VITE_FFMPEG_CORE_BASE_URL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/umd, https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd,https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/umd",
    });

    expect(candidates).toEqual([
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/umd",
      "https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd",
    ]);
  });

  it("配置 skip bundled 后会强制走远端 core", () => {
    expect(shouldUseBundledFfmpegCore({
      VITE_FFMPEG_CORE_SKIP_BUNDLED: "true",
    })).toBe(false);
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
});
