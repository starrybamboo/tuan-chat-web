import type { ApiRequestOptions } from "@tuanchat/openapi-client/core/ApiRequestOptions";

import { ApiError } from "@tuanchat/openapi-client/core/ApiError";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const platformMock = vi.hoisted(() => ({
  OS: "ios",
}));

const fileSystemMock = vi.hoisted(() => ({
  getInfoAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  uploadAsync: vi.fn(),
  EncodingType: {
    Base64: "base64",
  },
  FileSystemUploadType: {
    BINARY_CONTENT: "binary",
  },
}));

const imageCompressMock = vi.hoisted(() => ({
  compressImageToWebp: vi.fn(),
  IMAGE_COMPRESS_PROFILES: {
    low: { maxWidthOrHeight: 200, maxSizeKB: 40, quality: 1 },
    medium: { maxWidthOrHeight: 512, maxSizeKB: 150, quality: 1 },
  },
}));

vi.mock("react-native", () => ({
  Platform: platformMock,
}));

vi.mock("expo-file-system/legacy", () => ({
  EncodingType: fileSystemMock.EncodingType,
  FileSystemUploadType: fileSystemMock.FileSystemUploadType,
  getInfoAsync: fileSystemMock.getInfoAsync,
  readAsStringAsync: fileSystemMock.readAsStringAsync,
  uploadAsync: fileSystemMock.uploadAsync,
}));

vi.mock("../../lib/mobile-image-compress", () => ({
  IMAGE_COMPRESS_PROFILES: imageCompressMock.IMAGE_COMPRESS_PROFILES,
  compressImageToWebp: imageCompressMock.compressImageToWebp,
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

describe("uploadMobileMessageAttachments", () => {
  beforeEach(() => {
    platformMock.OS = "ios";
    fileSystemMock.getInfoAsync.mockReset();
    fileSystemMock.readAsStringAsync.mockReset();
    fileSystemMock.uploadAsync.mockReset();
    imageCompressMock.compressImageToWebp.mockReset();
    fileSystemMock.getInfoAsync.mockResolvedValue({ exists: true, size: 5 });
    fileSystemMock.readAsStringAsync.mockResolvedValue("AQIDBAU=");
    fileSystemMock.uploadAsync.mockResolvedValue({ status: 200 });
    imageCompressMock.compressImageToWebp
      .mockResolvedValueOnce({ uri: "file:///cache/image-low.webp", size: 10 })
      .mockResolvedValueOnce({ uri: "file:///cache/image-medium.webp", size: 20 });
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
      fileName: "photo.jpg",
      scene: 1,
      sizeBytes: 5,
      mimeType: "image/jpeg",
      contentType: "image/jpeg",
      metadata: expect.objectContaining({ clientPlatform: "ios" }),
    }));
    expect(fileSystemMock.uploadAsync).toHaveBeenCalledWith(
      "https://oss.example.com/low",
      "file:///cache/image-low.webp",
      expect.objectContaining({ uploadType: "binary" }),
    );
    expect(fileSystemMock.uploadAsync).toHaveBeenCalledWith(
      "https://oss.example.com/medium",
      "file:///cache/image-medium.webp",
      expect.objectContaining({ uploadType: "binary" }),
    );
    expect(client.mediaController.completeUpload).toHaveBeenCalledWith(77);
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
      fileName: "sticker.png",
      scene: 2,
      sizeBytes: 5,
      mimeType: "image/png",
      contentType: "image/png",
    }));
    expect(fileSystemMock.uploadAsync).not.toHaveBeenCalled();
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
      .mockResolvedValueOnce({ uri: "blob://sticker-low", size: 3 })
      .mockResolvedValueOnce({ uri: "blob://sticker-medium", size: 6 });
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
      .mockResolvedValueOnce({ uri: "blob://low", size: 3 })
      .mockResolvedValueOnce({ uri: "blob://medium", size: 6 });
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

    expect(fileSystemMock.uploadAsync).not.toHaveBeenCalled();
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

    expect(fileSystemMock.uploadAsync).not.toHaveBeenCalled();
    expect(client.mediaController.completeUpload).not.toHaveBeenCalled();
  });
});
