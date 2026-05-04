import { describe, expect, it } from "vitest";

import {
  inferMediaTypeFromMimeType,
  inferMimeTypeFromFileName,
  normalizeFileMimeType,
  normalizeMimeType,
} from "./mediaMime";

describe("mediaMime", () => {
  it("会把常见后缀推断成正确 MIME", () => {
    expect(inferMimeTypeFromFileName("cover.png")).toBe("image/png");
    expect(inferMimeTypeFromFileName("song.m4a", "audio")).toBe("audio/mp4");
    expect(inferMimeTypeFromFileName("clip.webm", "audio")).toBe("audio/webm");
    expect(inferMimeTypeFromFileName("clip.webm", "video")).toBe("video/webm");
    expect(inferMimeTypeFromFileName("portrait.heic")).toBe("image/heic");
  });

  it("会把 binary/octet-stream 归一化成 application/octet-stream", () => {
    expect(normalizeMimeType("binary/octet-stream")).toBe("application/octet-stream");
    expect(inferMediaTypeFromMimeType("application/x-matroska")).toBe("video");
  });

  it("会为缺失类型的文件补齐 MIME", async () => {
    const pngHeader = new Uint8Array([
      0x89,
      0x50,
      0x4E,
      0x47,
      0x0D,
      0x0A,
      0x1A,
      0x0A,
      0x00,
      0x00,
      0x00,
      0x0D,
      0x49,
      0x48,
      0x44,
      0x52,
    ]);
    const file = new File([pngHeader], "cover.bin", { type: "application/octet-stream" });

    const normalized = await normalizeFileMimeType(file, { expectedMediaType: "image" });

    expect(normalized.type).toBe("image/png");
  });

  it("不会把无后缀 WebP 按预期类型误判成 webm", async () => {
    const webpHeader = new Uint8Array([
      0x52,
      0x49,
      0x46,
      0x46,
      0x18,
      0x00,
      0x00,
      0x00,
      0x57,
      0x45,
      0x42,
      0x50,
      0x56,
      0x50,
      0x38,
      0x20,
    ]);
    const file = new File([webpHeader], "asset.bin", { type: "application/octet-stream" });

    const normalizedAsVideo = await normalizeFileMimeType(file, { expectedMediaType: "video" });
    const normalizedAsAudio = await normalizeFileMimeType(file, { expectedMediaType: "audio" });

    expect(normalizedAsVideo.type).toBe("image/webp");
    expect(normalizedAsAudio.type).toBe("image/webp");
  });

  it("会把无后缀 AVIF/HEIC 文件头识别成图片", async () => {
    const avifHeader = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x20,
      0x66,
      0x74,
      0x79,
      0x70,
      0x61,
      0x76,
      0x69,
      0x66,
      0x00,
      0x00,
      0x00,
      0x00,
    ]);
    const heicHeader = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x20,
      0x66,
      0x74,
      0x79,
      0x70,
      0x68,
      0x65,
      0x69,
      0x63,
      0x00,
      0x00,
      0x00,
      0x00,
    ]);

    const normalizedAvif = await normalizeFileMimeType(
      new File([avifHeader], "asset.bin", { type: "application/octet-stream" }),
      { expectedMediaType: "video" },
    );
    const normalizedHeic = await normalizeFileMimeType(
      new File([heicHeader], "asset.bin", { type: "application/octet-stream" }),
      { expectedMediaType: "video" },
    );

    expect(normalizedAvif.type).toBe("image/avif");
    expect(normalizedHeic.type).toBe("image/heic");
  });
});
