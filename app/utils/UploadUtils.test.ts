import { beforeEach, describe, expect, it, vi } from "vitest";

import { UploadUtils } from "./UploadUtils";
import { uploadMediaFile } from "./mediaUpload";
import { transcodeVideoFileToWebmOrThrow } from "./videoTranscodeUtils";

vi.mock("./mediaUpload", () => ({
  uploadMediaFile: vi.fn(),
}));

vi.mock("./videoTranscodeUtils", () => ({
  transcodeVideoFileToWebmOrThrow: vi.fn(),
}));

describe("uploadUtils media service adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as any).__TC_VIDEO_UPLOAD_ENABLE_TRANSCODE;
  });

  it("视频上传会先走现有转码预处理，再交给媒体服务并返回 high 变体", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(1024)], "clip.mp4", { type: "video/mp4" });
    const transcodedFile = new File([new Uint8Array(256)], "clip.webm", { type: "video/webm" });
    const transcodeMock = transcodeVideoFileToWebmOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockResolvedValueOnce(transcodedFile);
    const uploadMediaFileMock = uploadMediaFile as ReturnType<typeof vi.fn>;
    uploadMediaFileMock.mockResolvedValueOnce({
      fileId: 42,
      mediaType: "video",
      uploadRequired: true,
    });

    const result = await utils.uploadVideo(file, 1);

    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(uploadMediaFileMock).toHaveBeenCalledWith(transcodedFile, { scene: 1 });
    expect(result).toEqual({
      fileId: 42,
      fileName: "clip.webm",
      mediaType: "video",
      originalUrl: "/media/v1/files/042/42/original",
      size: transcodedFile.size,
      uploadRequired: true,
      url: "/media/v1/files/042/42/video/high.webm",
    });
  });

  it("显式关闭浏览器视频转码时，视频原文件直接交给媒体服务", async () => {
    (globalThis as any).__TC_VIDEO_UPLOAD_ENABLE_TRANSCODE = false;
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(4096)], "movie.mkv", { type: "video/x-matroska" });
    const uploadMediaFileMock = uploadMediaFile as ReturnType<typeof vi.fn>;
    uploadMediaFileMock.mockResolvedValueOnce({
      fileId: 43,
      mediaType: "video",
      uploadRequired: false,
    });

    const result = await utils.uploadVideo(file, 1);

    expect(transcodeVideoFileToWebmOrThrow).not.toHaveBeenCalled();
    expect(uploadMediaFileMock).toHaveBeenCalledWith(file, { scene: 1 });
    expect(result.url).toBe("/media/v1/files/043/43/video/high.webm");
    expect(result.fileId).toBe(43);
  });

  it("转码发生 wasm OOM 时回退原视频再交给媒体服务", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(2048)], "sample.mkv", { type: "video/x-matroska" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const transcodeMock = transcodeVideoFileToWebmOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockRejectedValueOnce(new Error("RuntimeError: memory access out of bounds"));
    const uploadMediaFileMock = uploadMediaFile as ReturnType<typeof vi.fn>;
    uploadMediaFileMock.mockResolvedValueOnce({
      fileId: 44,
      mediaType: "video",
      uploadRequired: true,
    });

    const result = await utils.uploadVideo(file, 1);

    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    expect(uploadMediaFileMock).toHaveBeenCalledWith(file, { scene: 1 });
    expect(result.url).toBe("/media/v1/files/044/44/video/high.webm");
    warnSpy.mockRestore();
  });

  it("非 OOM 的转码失败继续抛错，不进入媒体服务", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(1024)], "broken.mkv", { type: "video/x-matroska" });
    const transcodeMock = transcodeVideoFileToWebmOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockRejectedValueOnce(new Error("transcode failed"));

    await expect(utils.uploadVideo(file, 1)).rejects.toThrow("transcode failed");
    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(uploadMediaFile).not.toHaveBeenCalled();
  });

  it("图片上传通过媒体服务返回 high 变体地址", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array([1, 2, 3, 4])], "same.png", { type: "image/png" });
    const uploadMediaFileMock = uploadMediaFile as ReturnType<typeof vi.fn>;
    uploadMediaFileMock.mockResolvedValueOnce({
      fileId: 45,
      mediaType: "image",
      uploadRequired: false,
    });

    const result = await utils.uploadImg(file, 1);

    expect(uploadMediaFileMock).toHaveBeenCalledWith(file, { scene: 1 });
    expect(result).toBe("/media/v1/files/045/45/image/high.webp");
  });

  it("图片上传入口会拒绝无法识别为图片的文件", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array([1, 2, 3, 4])], "note.txt", { type: "application/octet-stream" });

    await expect(utils.uploadImg(file, 1)).rejects.toThrow("只支持图片文件格式");
    expect(uploadMediaFile).not.toHaveBeenCalled();
  });

  it("文件读取失败时显式抛错，避免哈希计算挂起", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array([1, 2, 3])], "broken.bin", { type: "application/octet-stream" });
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      public onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      public onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
      public onabort: ((event: ProgressEvent<FileReader>) => void) | null = null;
      public error: Error | null = new Error("mock read error");

      public readAsArrayBuffer(_blob: Blob): void {
        this.onerror?.({ target: this } as unknown as ProgressEvent<FileReader>);
      }
    }

    try {
      globalThis.FileReader = MockFileReader as any;
      await expect(utils.calculateFileHash(file)).rejects.toThrow("mock read error");
    }
    finally {
      globalThis.FileReader = originalFileReader;
    }
  });
});
