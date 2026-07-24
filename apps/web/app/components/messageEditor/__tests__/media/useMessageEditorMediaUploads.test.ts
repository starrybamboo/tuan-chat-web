import { describe, expect, it, vi } from "vitest";

import type { MessageEditorMediaUploadDependencies } from "../../block/useMessageEditorMediaUploads";

import { uploadMessageEditorMediaFile } from "../../block/useMessageEditorMediaUploads";

function createDependencies(): MessageEditorMediaUploadDependencies {
  return {
    readImageDimensions: vi.fn(async () => ({ height: 800, width: 1200 })),
    readMediaDuration: vi.fn(async () => 42),
    readVideoDimensions: vi.fn(async () => ({ height: 1080, width: 1920 })),
    uploadUtils: {
      uploadAudioAsset: vi.fn(async () => ({
        fileId: 3,
        fileName: "voice.webm",
        mediaType: "audio" as const,
        originalUrl: "https://example.com/voice.webm",
        size: 30,
        uploadRequired: true,
        url: "https://example.com/voice.webm",
      })),
      uploadDualImage: vi.fn(async () => ({
        fileId: 1,
        mediaType: "image" as const,
        originalSize: 10,
        originalUrl: "https://example.com/photo.png",
        url: "https://example.com/photo.png",
      })),
      uploadFileAsset: vi.fn(async () => ({
        fileId: 2,
        fileName: "notes.pdf",
        mediaType: "document" as const,
        originalUrl: "https://example.com/notes.pdf",
        size: 20,
        uploadRequired: true,
        url: "https://example.com/notes.pdf",
      })),
      uploadVideo: vi.fn(async () => ({
        fileId: 4,
        fileName: "clip.mp4",
        mediaType: "video" as const,
        originalUrl: "https://example.com/clip.mp4",
        size: 40,
        uploadRequired: true,
        url: "https://example.com/clip.mp4",
      })),
    },
  };
}

describe("uploadMessageEditorMediaFile", () => {
  it("builds an image payload with dimensions", async () => {
    const file = new File(["image-data"], "photo.png", { type: "image/png" });

    await expect(uploadMessageEditorMediaFile("image", file, createDependencies())).resolves.toEqual({
      fileId: 1,
      fileName: "photo.png",
      height: 800,
      mediaType: "image",
      size: file.size,
      width: 1200,
    });
  });

  it("builds a generic file payload", async () => {
    const file = new File(["document-data"], "notes.pdf", { type: "application/pdf" });

    await expect(uploadMessageEditorMediaFile("file", file, createDependencies())).resolves.toEqual({
      fileId: 2,
      fileName: "notes.pdf",
      mediaType: "document",
      size: file.size,
    });
  });

  it("builds an audio payload with duration", async () => {
    const file = new File(["audio-data"], "voice.webm", { type: "audio/webm" });

    await expect(uploadMessageEditorMediaFile("audio", file, createDependencies())).resolves.toEqual({
      fileId: 3,
      fileName: "voice.webm",
      mediaType: "audio",
      second: 42,
      size: file.size,
    });
  });

  it("rejects audio whose duration cannot be read", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.readMediaDuration).mockResolvedValue(undefined);
    const file = new File(["audio-data"], "voice.webm", { type: "audio/webm" });

    await expect(uploadMessageEditorMediaFile("audio", file, dependencies)).rejects.toThrow("无法读取音频时长");
  });

  it("builds a video payload with dimensions and duration", async () => {
    const file = new File(["video-data"], "clip.mp4", { type: "video/mp4" });

    await expect(uploadMessageEditorMediaFile("video", file, createDependencies())).resolves.toEqual({
      fileId: 4,
      fileName: "clip.mp4",
      height: 1080,
      mediaType: "video",
      second: 42,
      size: file.size,
      width: 1920,
    });
  });
});
