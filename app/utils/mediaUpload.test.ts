import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { transcodeAudioFileToOpusOrThrow } from "./audioTranscodeUtils";
import { generateMediaUploadFiles, uploadMediaFile } from "./mediaUpload";
import { transcodeVideoFileToWebmOrThrow } from "./videoTranscodeUtils";

const {
  compressImageMock,
  normalizeFileMimeTypeMock,
  extractNovelAiMetadataFromPngBytesMock,
  extractNovelAiMetadataFromWebpBytesMock,
  requestMock,
  resolveOssUploadTargetMock,
} = vi.hoisted(() => ({
  compressImageMock: vi.fn(),
  normalizeFileMimeTypeMock: vi.fn(),
  extractNovelAiMetadataFromPngBytesMock: vi.fn(),
  extractNovelAiMetadataFromWebpBytesMock: vi.fn(),
  requestMock: vi.fn(),
  resolveOssUploadTargetMock: vi.fn(),
}));

vi.mock("@/utils/imgCompressUtils", async () => {
  const actual = await vi.importActual<typeof import("./imgCompressUtils")>("./imgCompressUtils");
  return {
    ...actual,
    compressImage: compressImageMock,
  };
});

vi.mock("@/utils/mediaMime", () => ({
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

vi.mock("@/utils/novelaiImageMetadata", () => ({
  extractNovelAiMetadataFromPngBytes: extractNovelAiMetadataFromPngBytesMock,
  extractNovelAiMetadataFromWebpBytes: extractNovelAiMetadataFromWebpBytesMock,
}));

vi.mock("@/utils/audioTranscodeUtils", () => ({
  transcodeAudioFileToOpusOrThrow: vi.fn(),
}));

vi.mock("@/utils/videoTranscodeUtils", () => ({
  transcodeVideoFileToWebmOrThrow: vi.fn(),
}));

vi.mock("@/utils/ossUploadTarget", () => ({
  resolveOssUploadTarget: resolveOssUploadTargetMock,
}));

vi.mock("../../api/instance", () => ({
  tuanchat: {
    request: {
      request: requestMock,
    },
  },
}));

describe("mediaUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeFileMimeTypeMock.mockImplementation(async (file: File) => file);
    extractNovelAiMetadataFromPngBytesMock.mockReturnValue(null);
    extractNovelAiMetadataFromWebpBytesMock.mockReturnValue(null);
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

  it("图片派生文件会按 low -> medium 顺序串行生成", async () => {
    const order: string[] = [];
    compressImageMock.mockImplementation(async (_file: File, profile: { maxWidthOrHeight?: number }) => {
      order.push(`start-${profile.maxWidthOrHeight}`);
      await Promise.resolve();
      order.push(`end-${profile.maxWidthOrHeight}`);
      return new File([String(profile.maxWidthOrHeight)], `derived-${profile.maxWidthOrHeight}.webp`, { type: "image/webp" });
    });

    const file = new File([new Uint8Array(1024)], "demo.png", { type: "image/png" });
    const result = await generateMediaUploadFiles(file);

    expect(order).toEqual([
      "start-200",
      "end-200",
      "start-512",
      "end-512",
    ]);
    expect(result.filesByQuality.low?.name).toBe("derived-200.webp");
    expect(result.filesByQuality.medium?.name).toBe("derived-512.webp");
  });

  it("图片 low 档派生标准与 40KB 缩略图上限保持一致", async () => {
    const file = new File([new Uint8Array(1024)], "demo.png", { type: "image/png" });

    await generateMediaUploadFiles(file);

    expect(compressImageMock).toHaveBeenNthCalledWith(1, file, expect.objectContaining({
      maxWidthOrHeight: 200,
      maxSizeKB: 40,
      fileType: "image/webp",
    }));
    expect(compressImageMock).not.toHaveBeenCalledWith(file, expect.objectContaining({
      maxWidthOrHeight: 2560,
    }));
  });

  it("聊天室场景的图片只生成 low 和 medium，不生成 original 上传文件", async () => {
    const file = new File([new Uint8Array(1024)], "room.png", { type: "image/png" });

    const result = await generateMediaUploadFiles(file, 1);

    expect(Object.keys(result.filesByQuality).sort()).toEqual(["low", "medium"]);
    expect(result.filesByQuality.original).toBeUndefined();
  });

  it("聊天室场景上传图片时只会上传 low 和 medium 目标", async () => {
    const file = new File([new Uint8Array(1024)], "room.png", { type: "image/png" });
    requestMock.mockResolvedValueOnce({
      success: true,
      data: {
        fileId: 42,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 99,
        uploadTargets: {
          low: { uploadUrl: "https://oss.example.com/low" },
          medium: { uploadUrl: "https://oss.example.com/medium" },
        },
      },
    });
    requestMock.mockResolvedValueOnce({ success: true });

    const result = await uploadMediaFile(file, { scene: 1 });

    expect(result).toEqual({
      fileId: 42,
      mediaType: "image",
      uploadRequired: true,
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "/media/prepare-upload",
      body: expect.objectContaining({
        scene: 1,
      }),
    }));
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

    expect(requestMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("直传完成后取消不会继续 complete 上传会话", async () => {
    const controller = new AbortController();
    const file = new File([new Uint8Array(1024)], "demo.png", { type: "image/png" });
    requestMock.mockResolvedValueOnce({
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

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalledWith(expect.objectContaining({
      url: "/media/upload-sessions/99/complete",
    }));
  });
});
