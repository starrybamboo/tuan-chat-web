import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { transcodeAudioFileToOpusOrThrow } from "./audioTranscodeUtils";
import { generateMediaUploadFiles, uploadGeneratedMediaFiles, uploadMediaFile } from "./mediaUpload";
import { transcodeVideoFileToWebmOrThrow } from "./videoTranscodeUtils";

const {
  compressImageMock,
  normalizeFileMimeTypeMock,
  extractNovelAiMetadataFromPngBytesMock,
  extractNovelAiMetadataFromWebpBytesMock,
  prepareUploadMock,
  completeUploadMock,
  tuanchatRequestMock,
  resolveOssUploadTargetMock,
} = vi.hoisted(() => ({
  compressImageMock: vi.fn(),
  normalizeFileMimeTypeMock: vi.fn(),
  extractNovelAiMetadataFromPngBytesMock: vi.fn(),
  extractNovelAiMetadataFromWebpBytesMock: vi.fn(),
  prepareUploadMock: vi.fn(),
  completeUploadMock: vi.fn(),
  tuanchatRequestMock: vi.fn(),
  resolveOssUploadTargetMock: vi.fn(),
}));

vi.mock("@/utils/media/imgCompressUtils", async () => {
  const actual = await vi.importActual<typeof import("./imgCompressUtils")>("./imgCompressUtils");
  return {
    ...actual,
    compressImage: compressImageMock,
  };
});

vi.mock("@/utils/media/mediaMime", () => ({
  inferMediaTypeFromMimeType: (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return "image";
    if (mimeType.startsWith("audio/"))
      return "audio";
    if (mimeType.startsWith("video/"))
      return "video";
    return "other";
  },
  normalizeFileMimeType: normalizeFileMimeTypeMock,
  normalizeMimeType: (mimeType: string) => mimeType,
}));

vi.mock("@/utils/media/novelaiImageMetadata", () => ({
  extractNovelAiMetadataFromPngBytes: extractNovelAiMetadataFromPngBytesMock,
  extractNovelAiMetadataFromWebpBytes: extractNovelAiMetadataFromWebpBytesMock,
}));

vi.mock("@/utils/media/audioTranscodeUtils", () => ({
  transcodeAudioFileToOpusOrThrow: vi.fn(),
}));

vi.mock("@/utils/media/videoTranscodeUtils", () => ({
  transcodeVideoFileToWebmOrThrow: vi.fn(),
}));

vi.mock("@/utils/media/ossUploadTarget", () => ({
  resolveOssUploadTarget: resolveOssUploadTargetMock,
}));

vi.mock("../../../api/instance", () => ({
  tuanchat: {
    request: {
      request: tuanchatRequestMock,
    },
    mediaController: {
      prepareUpload: prepareUploadMock,
      completeUpload: completeUploadMock,
    },
  },
}));

describe("mediaUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeFileMimeTypeMock.mockImplementation(async (file: File) => file);
    extractNovelAiMetadataFromPngBytesMock.mockReturnValue(null);
    extractNovelAiMetadataFromWebpBytesMock.mockReturnValue(null);
    tuanchatRequestMock.mockImplementation(async ({ url, body }: { url: string; body?: unknown }) => {
      if (url === "/media/prepare-upload") {
        return await prepareUploadMock(body);
      }
      const match = url.match(/^\/media\/upload-sessions\/(\d+)\/complete$/);
      if (match) {
        return await completeUploadMock(Number(match[1]), body);
      }
      throw new Error(`unexpected request: ${url}`);
    });
    compressImageMock.mockImplementation(async (_file: File, profile: { maxWidthOrHeight?: number }) => {
      const label = String(profile.maxWidthOrHeight ?? "original");
      return new File([label], `derived-${label}.webp`, { type: "image/webp" });
    });
    resolveOssUploadTargetMock.mockImplementation((uploadUrl: string, _file: File, uploadHeaders?: Record<string, string>) => ({
      targetUrl: uploadUrl,
      headers: uploadHeaders ?? {},
    }));
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("非聊天室图片会先生成 WebP original，再并行生成 low 和 medium，不再生成 high", async () => {
    const order: string[] = [];
    compressImageMock.mockImplementation(async (_file: File, profile: { maxWidthOrHeight?: number; maxSizeKB?: number }) => {
      order.push(`start-${profile.maxWidthOrHeight}`);
      await Promise.resolve();
      order.push(`end-${profile.maxWidthOrHeight}`);
      const bytes = profile.maxSizeKB === 3072 ? 900 * 1024 : 1024;
      return new File([new Uint8Array(bytes)], `derived-${profile.maxWidthOrHeight}.webp`, { type: "image/webp" });
    });

    const file = new File([new Uint8Array(1024)], "demo.png", { type: "image/png" });
    const result = await generateMediaUploadFiles(file);

    expect(order).toEqual([
      "start-2560",
      "end-2560",
      "start-200",
      "start-512",
      "end-200",
      "end-512",
    ]);
    expect(result.filesByQuality.original?.name).toBe("derived-2560.webp");
    expect(result.filesByQuality.low?.name).toBe("derived-200.webp");
    expect(result.filesByQuality.medium?.name).toBe("derived-512.webp");
    expect(result.filesByQuality.high).toBeUndefined();
    expect(result.metadata.uploadedQualities).toEqual(["original", "low", "medium"]);
  });

  it("图片 low 档派生标准与 40KB 缩略图上限保持一致", async () => {
    const file = new File([new Uint8Array(1024)], "demo.png", { type: "image/png" });
    compressImageMock.mockImplementation(async (_file: File, profile: { maxSizeKB?: number }) => {
      const bytes = profile.maxSizeKB === 3072 ? 900 * 1024 : 1024;
      return new File([new Uint8Array(bytes)], `derived-${profile.maxSizeKB}.webp`, { type: "image/webp" });
    });

    await generateMediaUploadFiles(file);

    expect(compressImageMock).toHaveBeenNthCalledWith(2, expect.any(File), expect.objectContaining({
      maxWidthOrHeight: 200,
      maxSizeKB: 40,
      fileType: "image/webp",
    }));
    expect(compressImageMock).toHaveBeenCalledWith(file, expect.objectContaining({
      maxWidthOrHeight: 2560,
      maxSizeKB: 3072,
    }));
  });

  it("非聊天室图片 original 始终压成 WebP 且上限为 3MiB", async () => {
    const file = new File([new Uint8Array(1024)], "avatar.png", { type: "image/png" });
    compressImageMock.mockImplementation(async (_file: File, profile: { maxSizeKB?: number }) => {
      return new File([new Uint8Array(1024)], `derived-${profile.maxSizeKB}.webp`, { type: "image/webp" });
    });

    const result = await generateMediaUploadFiles(file);

    expect(compressImageMock).toHaveBeenNthCalledWith(1, file, expect.objectContaining({
      maxWidthOrHeight: 2560,
      maxSizeKB: 3072,
      fileType: "image/webp",
      preserveNovelAiMetadata: true,
      forceOutput: true,
    }));
    expect(result.filesByQuality.original?.name).toBe("derived-3072.webp");
    expect(result.filesByQuality.low).toBeUndefined();
    expect(result.metadata.uploadedQualities).toEqual(["original"]);
  });

  it("聊天室场景的图片也会生成 WebP original、low 和 medium，但不再生成 high", async () => {
    const file = new File([new Uint8Array(1024)], "room.png", { type: "image/png" });
    compressImageMock.mockImplementation(async (_file: File, profile: { maxWidthOrHeight?: number; maxSizeKB?: number }) => {
      const bytes = profile.maxSizeKB === 3072 ? 900 * 1024 : 1024;
      return new File([new Uint8Array(bytes)], `derived-${profile.maxWidthOrHeight}.webp`, { type: "image/webp" });
    });

    const result = await generateMediaUploadFiles(file, 1);

    expect(Object.keys(result.filesByQuality).sort()).toEqual(["low", "medium", "original"]);
    expect(result.filesByQuality.original?.type).toBe("image/webp");
    expect(result.filesByQuality.high).toBeUndefined();
    expect(compressImageMock).toHaveBeenCalledWith(file, expect.objectContaining({
      maxWidthOrHeight: 2560,
      maxSizeKB: 3072,
      fileType: "image/webp",
      preserveNovelAiMetadata: true,
      forceOutput: true,
    }));
    expect(compressImageMock).not.toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ maxSizeKB: 800 }));
  });

  it("聊天室场景上传图片时会上传 original、low 和 medium，跳过后端遗留 high 目标", async () => {
    const file = new File([new Uint8Array(1024)], "room.png", { type: "image/png" });
    compressImageMock.mockImplementation(async (_file: File, profile: { maxSizeKB?: number }) => {
      const bytes = profile.maxSizeKB === 3072 ? 900 * 1024 : 1024;
      return new File([new Uint8Array(bytes)], `derived-${profile.maxSizeKB}.webp`, { type: "image/webp" });
    });
    prepareUploadMock.mockResolvedValueOnce({
      success: true,
      data: {
        fileId: 42,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 99,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
          low: { uploadUrl: "https://oss.example.com/low" },
          medium: { uploadUrl: "https://oss.example.com/medium" },
          high: { uploadUrl: "https://oss.example.com/high" },
        },
      },
    });
    completeUploadMock.mockResolvedValueOnce({ success: true });

    const result = await uploadMediaFile(file, { scene: 1 });

    expect(result).toEqual(expect.objectContaining({
      fileId: 42,
      mediaType: "image",
      uploadRequired: true,
      degraded: false,
    }));
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(globalThis.fetch).not.toHaveBeenCalledWith("https://oss.example.com/high", expect.anything());
    expect(prepareUploadMock).toHaveBeenCalledWith(expect.objectContaining({
      scene: 1,
    }));
    expect(completeUploadMock).toHaveBeenCalledWith(99, expect.objectContaining({
      availableQualities: ["original", "low", "medium"],
      pendingQualities: [],
      failedQualities: [],
      degraded: false,
      failedTargets: [],
    }));
  });

  it("派生 target 首次失败后会按 target 重试并在成功后标记为可用", async () => {
    const original = new File(["original"], "original.webp", { type: "image/webp" });
    const low = new File(["low"], "low.webp", { type: "image/webp" });
    prepareUploadMock.mockResolvedValueOnce({
      success: true,
      data: {
        fileId: 42,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 99,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
          low: { uploadUrl: "https://oss.example.com/low" },
        },
      },
    });
    completeUploadMock.mockResolvedValueOnce({ success: true });
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const result = await uploadGeneratedMediaFiles({
      original,
      mediaType: "image",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: { original, low },
    }, { retryPolicy: { baseDelayMs: 0, jitter: false } });

    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual(expect.objectContaining({
      availableQualities: ["original", "low"],
      pendingQualities: [],
      failedQualities: [],
      degraded: false,
    }));
    expect(completeUploadMock).toHaveBeenCalledWith(99, expect.objectContaining({
      availableQualities: ["original", "low"],
      pendingQualities: [],
      failedQualities: [],
      degraded: false,
    }));
  });

  it("派生 target 重试耗尽后会降级完成并上报 pending quality", async () => {
    const original = new File(["original"], "original.webp", { type: "image/webp" });
    const low = new File(["low"], "low.webp", { type: "image/webp" });
    prepareUploadMock.mockResolvedValueOnce({
      success: true,
      data: {
        fileId: 43,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 100,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
          low: { uploadUrl: "https://oss.example.com/low" },
        },
      },
    });
    completeUploadMock.mockResolvedValueOnce({ success: true });
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValue({ ok: false, status: 500 } as Response);

    const result = await uploadGeneratedMediaFiles({
      original,
      mediaType: "image",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: { original, low },
    }, { retryPolicy: { baseDelayMs: 0, jitter: false, maxAttempts: 3 } });

    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    expect(result).toEqual(expect.objectContaining({
      fileId: 43,
      availableQualities: ["original"],
      pendingQualities: ["low"],
      failedQualities: [],
      degraded: true,
      failedTargets: [expect.objectContaining({
        quality: "low",
        retryable: true,
      })],
    }));
    expect(completeUploadMock).toHaveBeenCalledWith(100, expect.objectContaining({
      availableQualities: ["original"],
      pendingQualities: ["low"],
      failedQualities: [],
      degraded: true,
      failedTargets: [expect.objectContaining({
        quality: "low",
        retryable: true,
      })],
    }));
  });

  it("primary target 临时失败后重试成功会继续完成上传", async () => {
    const original = new File(["original"], "original.webp", { type: "image/webp" });
    const low = new File(["low"], "low.webp", { type: "image/webp" });
    prepareUploadMock.mockResolvedValueOnce({
      success: true,
      data: {
        fileId: 44,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 101,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
          low: { uploadUrl: "https://oss.example.com/low" },
        },
      },
    });
    completeUploadMock.mockResolvedValueOnce({ success: true });
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const result = await uploadGeneratedMediaFiles({
      original,
      mediaType: "image",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: { original, low },
    }, { retryPolicy: { baseDelayMs: 0, jitter: false } });

    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(result.degraded).toBe(false);
    expect(completeUploadMock).toHaveBeenCalledWith(101, expect.objectContaining({
      availableQualities: ["original", "low"],
      degraded: false,
    }));
  });

  it("派生 target 凭证失效时不会继续重试旧 URL，并以 pending 状态完成", async () => {
    const original = new File(["original"], "original.webp", { type: "image/webp" });
    const low = new File(["low"], "low.webp", { type: "image/webp" });
    prepareUploadMock.mockResolvedValueOnce({
      success: true,
      data: {
        fileId: 45,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 102,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
          low: { uploadUrl: "https://oss.example.com/low" },
        },
      },
    });
    completeUploadMock.mockResolvedValueOnce({ success: true });
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 403 } as Response);

    const result = await uploadGeneratedMediaFiles({
      original,
      mediaType: "image",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: { original, low },
    }, { retryPolicy: { baseDelayMs: 0, jitter: false, maxAttempts: 3 } });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(result.pendingQualities).toEqual(["low"]);
    expect(result.failedTargets).toEqual([expect.objectContaining({
      quality: "low",
      retryable: false,
      credentialExpired: true,
    })]);
    expect(completeUploadMock).toHaveBeenCalledWith(102, expect.objectContaining({
      pendingQualities: ["low"],
      failedQualities: [],
      degraded: true,
    }));
  });

  it("primary target 重试耗尽时不会 complete 上传会话", async () => {
    const original = new File(["original"], "original.webp", { type: "image/webp" });
    prepareUploadMock.mockResolvedValueOnce({
      success: true,
      data: {
        fileId: 46,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 103,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
        },
      },
    });
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: false, status: 500 } as Response);

    await expect(uploadGeneratedMediaFiles({
      original,
      mediaType: "image",
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality: { original },
    }, { retryPolicy: { baseDelayMs: 0, jitter: false, maxAttempts: 2 } })).rejects.toThrow("媒体文件上传失败: 500");

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(completeUploadMock).not.toHaveBeenCalled();
  });

  it("非聊天室音频 low 和 medium 使用独立 FFmpeg 实例并行转码", async () => {
    const order: string[] = [];
    vi.mocked(transcodeAudioFileToOpusOrThrow).mockImplementation(async (_file: File, options: { bitrateKbps?: number; isolated?: boolean } = {}) => {
      order.push(`start-${options.bitrateKbps}`);
      await Promise.resolve();
      order.push(`end-${options.bitrateKbps}`);
      return new File([String(options.bitrateKbps)], `audio-${options.bitrateKbps}.webm`, { type: "audio/webm" });
    });

    const file = new File([new Uint8Array(1024)], "voice.mp3", { type: "audio/mpeg" });
    const result = await generateMediaUploadFiles(file, 2);

    expect(order).toEqual(["start-64", "start-128", "end-64", "end-128"]);
    expect(transcodeAudioFileToOpusOrThrow).toHaveBeenCalledWith(file, expect.objectContaining({
      bitrateKbps: 64,
      isolated: true,
    }));
    expect(transcodeAudioFileToOpusOrThrow).toHaveBeenCalledWith(file, expect.objectContaining({
      bitrateKbps: 128,
      isolated: true,
    }));
    expect(result.filesByQuality.high).toBeUndefined();
    expect(result.filesByQuality.low?.name).toBe("audio-64.webm");
    expect(result.filesByQuality.medium?.name).toBe("audio-128.webm");
    expect(result.filesByQuality.original).toBe(file);
  });

  it("非聊天室视频 low 和 medium 使用独立 FFmpeg 实例并行转码", async () => {
    const order: string[] = [];
    vi.mocked(transcodeVideoFileToWebmOrThrow).mockImplementation(async (_file: File, options: { crf?: number; isolated?: boolean; maxHeight?: number } = {}) => {
      order.push(`start-${options.maxHeight}`);
      await Promise.resolve();
      order.push(`end-${options.maxHeight}`);
      return new File([String(options.crf)], `video-${options.maxHeight}.webm`, { type: "video/webm" });
    });

    const file = new File([new Uint8Array(1024)], "clip.mp4", { type: "video/mp4" });
    const result = await generateMediaUploadFiles(file, 2);

    expect(order).toEqual(["start-360", "start-720", "end-360", "end-720"]);
    expect(transcodeVideoFileToWebmOrThrow).toHaveBeenCalledWith(file, expect.objectContaining({
      maxHeight: 360,
      isolated: true,
    }));
    expect(transcodeVideoFileToWebmOrThrow).toHaveBeenCalledWith(file, expect.objectContaining({
      maxHeight: 720,
      isolated: true,
    }));
    expect(result.filesByQuality.high).toBeUndefined();
    expect(result.filesByQuality.low?.name).toBe("video-360.webm");
    expect(result.filesByQuality.medium?.name).toBe("video-720.webm");
    expect(result.filesByQuality.original).toBe(file);
  });

  it("已是 WebM 的音频不会再次进入 FFmpeg 转码", async () => {
    const file = new File([new Uint8Array(1024)], "voice.webm", { type: "audio/webm" });

    const result = await generateMediaUploadFiles(file, 1);

    expect(transcodeAudioFileToOpusOrThrow).not.toHaveBeenCalled();
    expect(result.mediaType).toBe("audio");
    expect(result.filesByQuality).toEqual({ low: file });
  });

  it("已是 WebM 的视频不会再次进入 FFmpeg 转码", async () => {
    const file = new File([new Uint8Array(1024)], "clip.webm", { type: "video/webm" });

    const result = await generateMediaUploadFiles(file, 1);

    expect(transcodeVideoFileToWebmOrThrow).not.toHaveBeenCalled();
    expect(result.mediaType).toBe("video");
    expect(result.filesByQuality).toEqual({ low: file });
  });

  it("上传开始前取消会阻止 prepare 请求", async () => {
    const controller = new AbortController();
    controller.abort();
    const file = new File([new Uint8Array(1024)], "demo.png", { type: "image/png" });

    await expect(uploadMediaFile(file, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(prepareUploadMock).not.toHaveBeenCalled();
    expect(completeUploadMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("直传完成后取消不会继续 complete 上传会话", async () => {
    const controller = new AbortController();
    const file = new File([new Uint8Array(1024)], "demo.png", { type: "image/png" });
    prepareUploadMock.mockResolvedValueOnce({
      success: true,
      data: {
        fileId: 42,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 99,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
        },
      },
    });
    vi.mocked(globalThis.fetch).mockImplementation(async () => {
      controller.abort();
      return {
        ok: true,
        status: 200,
      } as Response;
    });

    await expect(uploadMediaFile(file, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(prepareUploadMock).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(completeUploadMock).not.toHaveBeenCalled();
  });
});
