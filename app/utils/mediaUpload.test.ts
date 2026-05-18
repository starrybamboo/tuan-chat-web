import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateMediaUploadFiles } from "./mediaUpload";

const {
  compressImageMock,
  normalizeFileMimeTypeMock,
  extractNovelAiMetadataFromPngBytesMock,
  extractNovelAiMetadataFromWebpBytesMock,
} = vi.hoisted(() => ({
  compressImageMock: vi.fn(),
  normalizeFileMimeTypeMock: vi.fn(),
  extractNovelAiMetadataFromPngBytesMock: vi.fn(),
  extractNovelAiMetadataFromWebpBytesMock: vi.fn(),
}));

vi.mock("@/utils/imgCompressUtils", async () => {
  const actual = await vi.importActual<typeof import("./imgCompressUtils")>("./imgCompressUtils");
  return {
    ...actual,
    compressImage: compressImageMock,
  };
});

vi.mock("@/utils/mediaMime", () => ({
  inferMediaTypeFromMimeType: (mimeType: string) => (mimeType.startsWith("image/") ? "image" : "other"),
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
  resolveOssUploadTarget: vi.fn(),
}));

vi.mock("../../api/instance", () => ({
  tuanchat: {
    request: {
      request: vi.fn(),
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
  });

  it("图片派生文件会按 low -> medium -> high 顺序串行生成", async () => {
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
      "start-2560",
      "end-2560",
    ]);
    expect(result.filesByQuality.low?.name).toBe("derived-200.webp");
    expect(result.filesByQuality.medium?.name).toBe("derived-512.webp");
    expect(result.filesByQuality.high?.name).toBe("derived-2560.webp");
  });
});
