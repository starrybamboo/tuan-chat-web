import type { ApiRequestOptions } from "@tuanchat/openapi-client/core/ApiRequestOptions";

import { ApiError } from "@tuanchat/openapi-client/core/ApiError";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const platformMock = vi.hoisted(() => ({
  OS: "ios",
}));

const fileSystemMock = vi.hoisted(() => ({
  bytes: vi.fn(),
  fileInfo: vi.fn(),
}));

const imageCompressMock = vi.hoisted(() => ({
  compressImageToWebp: vi.fn(),
  IMAGE_COMPRESS_PROFILES: {
    original: { maxWidthOrHeight: 2560, maxSizeKB: 3072, quality: 1 },
    low: { maxWidthOrHeight: 200, maxSizeKB: 40, quality: 1 },
    medium: { maxWidthOrHeight: 512, maxSizeKB: 150, quality: 1 },
  },
}));

const mobileGifToWebpMock = vi.hoisted(() => ({
  convertGifAttachmentToAnimatedWebp: vi.fn(),
  isGifAttachment: vi.fn((attachment: { fileName: string; mimeType?: string }) => {
    return attachment.mimeType === "image/gif" || attachment.fileName.toLowerCase().endsWith(".gif");
  }),
}));

vi.mock("react-native", () => ({
  Platform: platformMock,
}));

vi.mock("expo-file-system", () => ({
  File: class {
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    bytes() {
      return fileSystemMock.bytes(this.uri);
    }

    info() {
      return fileSystemMock.fileInfo(this.uri);
    }
  },
}));

vi.mock("../../lib/mobile-image-compress", () => ({
  IMAGE_COMPRESS_PROFILES: imageCompressMock.IMAGE_COMPRESS_PROFILES,
  compressImageToWebp: imageCompressMock.compressImageToWebp,
}));

vi.mock("../../lib/mobile-gif-to-webp", () => ({
  convertGifAttachmentToAnimatedWebp: mobileGifToWebpMock.convertGifAttachmentToAnimatedWebp,
  isGifAttachment: mobileGifToWebpMock.isGifAttachment,
}));

vi.mock("./mobileMessageAttachment", () => ({
  MOBILE_MESSAGE_ATTACHMENT_KIND: {
    AUDIO: "audio",
    FILE: "file",
    IMAGE: "image",
    VIDEO: "video",
  },
}));

function createMediaClient(response: {
  completeSuccess?: boolean;
  data?: Record<string, unknown>;
  errMsg?: string;
  success?: boolean;
}) {
  return {
    mediaController: {
      prepareUpload: vi.fn(async () => ({
        success: response.success ?? true,
        errMsg: response.errMsg,
        data: response.data,
      })),
      completeUpload: vi.fn(async () => ({
        success: response.completeSuccess ?? true,
      })),
    },
  };
}

function createApiResultError(message: string) {
  const request: ApiRequestOptions = {
    method: "POST",
    url: "/media/upload/prepare",
  };
  return new ApiError(request, {
    body: { success: false, errMsg: message },
    ok: true,
    status: 200,
    statusText: "OK",
    url: "https://api.example.com/media/upload/prepare",
  }, message);
}

function createWebpResult(uri: string, size: number, fileName = "image.webp") {
  return {
    fileName,
    mimeType: "image/webp",
    uri,
    size,
  };
}

function createFetchUploadMock(
  resolver: (url: string, init?: RequestInit) => { ok: boolean; status: number } = () => ({ ok: true, status: 200 }),
) {
  const uploadedBodies = new Map<string, BodyInit | null | undefined>();
  const fetchMock = vi.fn(async (input: any, init?: any) => {
    const url = String(input);
    if (init?.method === "PUT") {
      uploadedBodies.set(url, init.body);
      return resolver(url, init);
    }
    return {
      ok: true,
      blob: async () => new Blob([new Uint8Array(5)]),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, uploadedBodies };
}

describe("uploadMobileMessageAttachments", () => {
  beforeEach(() => {
    platformMock.OS = "ios";
    fileSystemMock.bytes.mockReset();
    fileSystemMock.fileInfo.mockReset();
    imageCompressMock.compressImageToWebp.mockReset();
    mobileGifToWebpMock.convertGifAttachmentToAnimatedWebp.mockReset();
    mobileGifToWebpMock.isGifAttachment.mockClear();
    fileSystemMock.fileInfo.mockReturnValue({ exists: true, size: 5 });
    fileSystemMock.bytes.mockImplementation(async () => new Uint8Array([1, 2, 3, 4, 5]));
    createFetchUploadMock();
    imageCompressMock.compressImageToWebp
      .mockResolvedValueOnce(createWebpResult("file:///cache/image-original.webp", 5))
      .mockResolvedValueOnce(createWebpResult("file:///cache/image-low.webp", 10, "image_low.webp"))
      .mockResolvedValueOnce(createWebpResult("file:///cache/image-medium.webp", 20, "image_medium.webp"));
    mobileGifToWebpMock.convertGifAttachmentToAnimatedWebp.mockResolvedValue(
      createWebpResult("file:///cache/animated-sticker.webp", 88, "animated-sticker.webp"),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns stable fileId drafts and never persists local image URIs", async () => {
    const { uploadMobileMessageAttachments } = await import("./mobileMessageAttachmentUpload");
    const client = createMediaClient({
      data: {
        fileId: 321,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 77,
        uploadTargets: {
          low: { uploadUrl: "https://oss.example.com/low" },
          medium: { uploadUrl: "https://oss.example.com/medium" },
        },
      },
    });

    const result = await uploadMobileMessageAttachments(client as any, [{
      id: "photo",
      uri: "file:///tmp/photo.jpg",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      kind: "image",
      width: 640,
      height: 480,
    }]);

    expect(result.uploadedImages).toEqual([{
      fileId: 321,
      width: 640,
      height: 480,
      size: 5,
      fileName: "photo.jpg",
    }]);
    expect(Object.keys(result.uploadedImages[0]!).sort()).toEqual([
      "fileId",
      "fileName",
      "height",
      "size",
      "width",
    ]);
    expect(client.mediaController.prepareUpload).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "image.webp",
      scene: 1,
      sizeBytes: 5,
      mimeType: "image/webp",
      contentType: "image/webp",
      metadata: expect.objectContaining({
        clientPlatform: "ios",
        uploadedQualities: ["original", "low", "medium"],
      }),
    }));
    expect(fetch).toHaveBeenCalledWith("https://oss.example.com/low", expect.objectContaining({
      body: expect.objectContaining({ uri: "file:///cache/image-low.webp" }),
      method: "PUT",
    }));
    expect(fetch).toHaveBeenCalledWith("https://oss.example.com/medium", expect.objectContaining({
      body: expect.objectContaining({ uri: "file:///cache/image-medium.webp" }),
      method: "PUT",
    }));
    expect(client.mediaController.completeUpload).toHaveBeenCalledWith(77, {
      availableQualities: ["low", "medium"],
      pendingQualities: [],
      failedQualities: [],
      degraded: false,
      failedTargets: [],
    });
  });

  it("allows sticker uploads to use the sticker media scene", async () => {
    const { uploadMobileMessageAttachments } = await import("./mobileMessageAttachmentUpload");
    const client = createMediaClient({
      data: {
        fileId: 432,
        mediaType: "image",
        uploadRequired: false,
      },
    });

    const result = await uploadMobileMessageAttachments(client as any, [{
      id: "sticker",
      uri: "file:///tmp/sticker.png",
      fileName: "sticker.png",
      mimeType: "image/png",
      kind: "image",
      width: 128,
      height: 128,
    }], { scene: 2 });

    expect(result.uploadedImages[0]?.fileId).toBe(432);
    expect(client.mediaController.prepareUpload).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "image.webp",
      scene: 2,
      sizeBytes: 5,
      mimeType: "image/webp",
      contentType: "image/webp",
    }));
    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/oss\.example\.com\//), expect.objectContaining({ method: "PUT" }));
    expect(client.mediaController.completeUpload).not.toHaveBeenCalled();
  });

  it("uploads cropped sticker webp as the original file for sticker scene", async () => {
    platformMock.OS = "web";
    const stickerBlob = new Blob(["sticker-webp"], { type: "image/webp" });
    const lowBlob = new Blob(["low"]);
    const mediumBlob = new Blob(["medium"]);
    const uploadedBodies = new Map<string, BodyInit | null | undefined>();
    const fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = String(input);
      if (init?.method === "PUT") {
        uploadedBodies.set(url, init.body);
        return { ok: true, status: 200 };
      }
      const blobByUrl: Record<string, Blob> = {
        "blob://sticker-webp": stickerBlob,
        "blob://sticker-low": lowBlob,
        "blob://sticker-medium": mediumBlob,
      };
      return {
        ok: true,
        blob: async () => blobByUrl[url],
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    imageCompressMock.compressImageToWebp.mockReset();
    imageCompressMock.compressImageToWebp
      .mockResolvedValueOnce(createWebpResult("blob://sticker-webp", stickerBlob.size, "sticker.webp"))
      .mockResolvedValueOnce(createWebpResult("blob://sticker-low", 3, "sticker_low.webp"))
      .mockResolvedValueOnce(createWebpResult("blob://sticker-medium", 6, "sticker_medium.webp"));
    const { uploadMobileMessageAttachments } = await import("./mobileMessageAttachmentUpload");
    const client = createMediaClient({
      data: {
        fileId: 777,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 99,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/sticker-original" },
          low: { uploadUrl: "https://oss.example.com/sticker-low" },
          medium: { uploadUrl: "https://oss.example.com/sticker-medium" },
        },
      },
    });

    await uploadMobileMessageAttachments(client as any, [{
      id: "sticker-webp",
      uri: "blob://sticker-webp",
      fileName: "sticker.webp",
      mimeType: "image/webp",
      kind: "image",
      width: 256,
      height: 256,
    }], { scene: 2 });

    expect(client.mediaController.prepareUpload).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "sticker.webp",
      scene: 2,
      mimeType: "image/webp",
      contentType: "image/webp",
    }));
    expect(uploadedBodies.get("https://oss.example.com/sticker-original")).toBe(stickerBlob);
    expect(uploadedBodies.get("https://oss.example.com/sticker-low")).toBe(lowBlob);
    expect(uploadedBodies.get("https://oss.example.com/sticker-medium")).toBe(mediumBlob);
  });

  it("converts gif stickers to animated webp original without static derivatives", async () => {
    const { uploadMobileMessageAttachments } = await import("./mobileMessageAttachmentUpload");
    const client = createMediaClient({
      data: {
        fileId: 778,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 100,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/gif-original" },
          low: { uploadUrl: "https://oss.example.com/gif-low" },
          medium: { uploadUrl: "https://oss.example.com/gif-medium" },
        },
      },
    });

    const result = await uploadMobileMessageAttachments(client as any, [{
      id: "gif-sticker",
      uri: "file:///tmp/sticker.gif",
      fileName: "sticker.gif",
      mimeType: "image/gif",
      kind: "image",
      width: 96,
      height: 96,
    }], { scene: 2 });

    expect(result.uploadedImages[0]).toEqual(expect.objectContaining({
      fileId: 778,
      fileName: "sticker.gif",
      size: 88,
    }));
    expect(mobileGifToWebpMock.convertGifAttachmentToAnimatedWebp).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "sticker.gif",
      uri: "file:///tmp/sticker.gif",
    }));
    expect(imageCompressMock.compressImageToWebp).not.toHaveBeenCalled();
    expect(client.mediaController.prepareUpload).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "animated-sticker.webp",
      scene: 2,
      sizeBytes: 88,
      mimeType: "image/webp",
      contentType: "image/webp",
      metadata: expect.objectContaining({
        uploadedQualities: ["original"],
      }),
    }));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("https://oss.example.com/gif-original", expect.objectContaining({
      body: expect.objectContaining({ uri: "file:///cache/animated-sticker.webp" }),
      method: "PUT",
    }));
    expect(client.mediaController.completeUpload).toHaveBeenCalledWith(100, {
      availableQualities: ["original"],
      pendingQualities: [],
      failedQualities: [],
      degraded: false,
      failedTargets: [],
    });
  });

  it("uploads web image derivatives from their own blob URIs", async () => {
    platformMock.OS = "web";
    const originalBlob = new Blob(["original"]);
    const lowBlob = new Blob(["low"]);
    const mediumBlob = new Blob(["medium"]);
    const uploadedBodies = new Map<string, BodyInit | null | undefined>();
    const fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = String(input);
      if (init?.method === "PUT") {
        uploadedBodies.set(url, init.body);
        return { ok: true, status: 200 };
      }
      const blobByUrl: Record<string, Blob> = {
        "blob://original": originalBlob,
        "blob://original-webp": originalBlob,
        "blob://low": lowBlob,
        "blob://medium": mediumBlob,
      };
      return {
        ok: true,
        blob: async () => blobByUrl[url],
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    imageCompressMock.compressImageToWebp.mockReset();
    imageCompressMock.compressImageToWebp
      .mockResolvedValueOnce(createWebpResult("blob://original-webp", 9, "web-photo.webp"))
      .mockResolvedValueOnce(createWebpResult("blob://low", 3, "web-photo_low.webp"))
      .mockResolvedValueOnce(createWebpResult("blob://medium", 6, "web-photo_medium.webp"));
    const { uploadMobileMessageAttachments } = await import("./mobileMessageAttachmentUpload");
    const client = createMediaClient({
      data: {
        fileId: 654,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 88,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
          low: { uploadUrl: "https://oss.example.com/low" },
          medium: { uploadUrl: "https://oss.example.com/medium" },
        },
      },
    });

    await uploadMobileMessageAttachments(client as any, [{
      id: "web-photo",
      uri: "blob://original",
      fileName: "web-photo.png",
      mimeType: "image/png",
      kind: "image",
      width: 100,
      height: 80,
    }]);

    expect(uploadedBodies.get("https://oss.example.com/original")).toBe(originalBlob);
    expect(uploadedBodies.get("https://oss.example.com/low")).toBe(lowBlob);
    expect(uploadedBodies.get("https://oss.example.com/medium")).toBe(mediumBlob);
    expect(fetchMock).toHaveBeenCalledWith("blob://low");
    expect(fetchMock).toHaveBeenCalledWith("blob://medium");
  });

  it("completes degraded image upload when a derivative target keeps failing", async () => {
    const { uploadMobileMessageAttachments } = await import("./mobileMessageAttachmentUpload");
    const client = createMediaClient({
      data: {
        fileId: 655,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 89,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
          low: { uploadUrl: "https://oss.example.com/low" },
          medium: { uploadUrl: "https://oss.example.com/medium" },
        },
      },
    });
    createFetchUploadMock((url: string) => {
      return url === "https://oss.example.com/low"
        ? { ok: false, status: 500 }
        : { ok: true, status: 200 };
    });

    const result = await uploadMobileMessageAttachments(client as any, [{
      id: "photo",
      uri: "file:///tmp/photo.jpg",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      kind: "image",
      width: 100,
      height: 80,
    }]);

    expect(result.uploadedImages[0]?.fileId).toBe(655);
    expect(fetch).toHaveBeenCalledWith("https://oss.example.com/original", expect.objectContaining({
      body: expect.objectContaining({ uri: "file:///cache/image-original.webp" }),
      method: "PUT",
    }));
    expect(fetch).toHaveBeenCalledWith("https://oss.example.com/low", expect.objectContaining({
      body: expect.objectContaining({ uri: "file:///cache/image-low.webp" }),
      method: "PUT",
    }));
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(client.mediaController.completeUpload).toHaveBeenCalledWith(89, {
      availableQualities: ["original", "medium"],
      pendingQualities: ["low"],
      failedQualities: [],
      degraded: true,
      failedTargets: [expect.objectContaining({
        quality: "low",
        retryable: true,
      })],
    });
  });

  it("returns failed attachments without blocking successful attachments when partial success is enabled", async () => {
    const { uploadMobileMessageAttachments } = await import("./mobileMessageAttachmentUpload");
    imageCompressMock.compressImageToWebp.mockReset();
    imageCompressMock.compressImageToWebp.mockImplementation(async (uri: string, profile: { maxSizeKB: number }, options?: { quality?: string }) => {
      const quality = options?.quality ?? String(profile.maxSizeKB);
      return createWebpResult(`${uri}-${quality}.webp`, profile.maxSizeKB, `${quality}.webp`);
    });
    const client = createMediaClient({
      data: {
        fileId: 700,
        mediaType: "image",
        uploadRequired: true,
        sessionId: 90,
        uploadTargets: {
          original: { uploadUrl: "https://oss.example.com/original" },
        },
      },
    });
    createFetchUploadMock((_url, init) => {
      const body = init?.body as { uri?: string } | undefined;
      return body?.uri?.includes("failed.png")
        ? { ok: false, status: 500 }
        : { ok: true, status: 200 };
    });

    const okAttachment = {
      id: "ok",
      uri: "file:///tmp/ok.png",
      fileName: "ok.png",
      mimeType: "image/png",
      kind: "image" as const,
      width: 10,
      height: 10,
    };
    const failedAttachment = {
      id: "failed",
      uri: "file:///tmp/failed.png",
      fileName: "failed.png",
      mimeType: "image/png",
      kind: "image" as const,
      width: 12,
      height: 12,
    };

    const result = await uploadMobileMessageAttachments(client as any, [okAttachment, failedAttachment], { allowPartialSuccess: true });

    expect(result.uploadedImages).toEqual([expect.objectContaining({
      fileId: 700,
      fileName: "ok.png",
    })]);
    expect(result.failedAttachments).toEqual([expect.objectContaining({
      attachment: failedAttachment,
      error: expect.objectContaining({ message: "文件传输失败: 500" }),
    })]);
    expect(client.mediaController.completeUpload).toHaveBeenCalledTimes(1);
  });

  it("propagates prepare failures before uploading any binary", async () => {
    const { uploadMobileMessageAttachments } = await import("./mobileMessageAttachmentUpload");
    const client = createMediaClient({
      success: false,
      errMsg: "准备上传失败：类型不支持",
    });

    await expect(uploadMobileMessageAttachments(client as any, [{
      id: "file",
      uri: "file:///tmp/archive.zip",
      fileName: "archive.zip",
      mimeType: "application/zip",
      kind: "file",
    }]))
      .rejects
      .toThrow("准备上传失败：类型不支持");

    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/oss\.example\.com\//), expect.objectContaining({ method: "PUT" }));
    expect(client.mediaController.completeUpload).not.toHaveBeenCalled();
  });

  it("propagates generated client ApiError errMsg before uploading any binary", async () => {
    const { uploadMobileMessageAttachments } = await import("./mobileMessageAttachmentUpload");
    const client = {
      mediaController: {
        prepareUpload: vi.fn(async () => {
          throw createApiResultError("准备上传失败：空间已归档");
        }),
        completeUpload: vi.fn(),
      },
    };

    await expect(uploadMobileMessageAttachments(client as any, [{
      id: "file",
      uri: "file:///tmp/archive.zip",
      fileName: "archive.zip",
      mimeType: "application/zip",
      kind: "file",
    }]))
      .rejects
      .toThrow("准备上传失败：空间已归档");

    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/oss\.example\.com\//), expect.objectContaining({ method: "PUT" }));
    expect(client.mediaController.completeUpload).not.toHaveBeenCalled();
  });
});
