import { beforeEach, describe, expect, it, vi } from "vitest";

import { transcodeAudioFileToOpusOrThrow } from "./audioTranscodeUtils";
import { uploadGeneratedMediaFiles, uploadMediaFile } from "./mediaUpload";
import { UploadUtils } from "./UploadUtils";
import { transcodeVideoFileToWebmOrThrow } from "./videoTranscodeUtils";

vi.mock("./mediaUpload", () => ({
  uploadGeneratedMediaFiles: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  uploadMediaFile: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("./audioTranscodeUtils", () => ({
  transcodeAudioFileToOpusOrThrow: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("./videoTranscodeUtils", () => ({
  transcodeVideoFileToWebmOrThrow: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

describe("uploadUtils media service adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as any).__TC_VIDEO_UPLOAD_ENABLE_TRANSCODE;
  });

  it("视频上传会先走现有转码预处理，再交给媒体服务并返回可用低档位地址", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(1024)], "clip.mp4", { type: "video/mp4" });
    const transcodedFile = new File([new Uint8Array(256)], "clip.webm", { type: "video/webm" });
    const transcodeMock = transcodeVideoFileToWebmOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockResolvedValueOnce(transcodedFile);
    const uploadGeneratedMediaFilesMock = uploadGeneratedMediaFiles as ReturnType<typeof vi.fn>;
    uploadGeneratedMediaFilesMock.mockResolvedValueOnce({
      fileId: 42,
      mediaType: "video",
      uploadRequired: true,
    });

    const result = await utils.uploadVideo(file, 1);

    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(uploadGeneratedMediaFilesMock).toHaveBeenCalledWith(expect.objectContaining({
      filesByQuality: { low: transcodedFile },
      mediaType: "video",
      original: transcodedFile,
    }), { scene: 1 });
    expect(uploadMediaFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      fileId: 42,
      fileName: "clip.webm",
      mediaType: "video",
      originalUrl: "https://media.tuan.chat/media/v1/files/042/42/video/low.webm",
      size: transcodedFile.size,
      uploadRequired: true,
      url: "https://media.tuan.chat/media/v1/files/042/42/video/low.webm",
    });
  });

  it("显式关闭浏览器视频转码时，视频原文件直接交给媒体服务", async () => {
    (globalThis as any).__TC_VIDEO_UPLOAD_ENABLE_TRANSCODE = false;
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(4096)], "movie.mkv", { type: "video/x-matroska" });
    const uploadGeneratedMediaFilesMock = uploadGeneratedMediaFiles as ReturnType<typeof vi.fn>;
    uploadGeneratedMediaFilesMock.mockResolvedValueOnce({
      fileId: 43,
      mediaType: "video",
      uploadRequired: false,
    });

    const result = await utils.uploadVideo(file, 1);

    expect(transcodeVideoFileToWebmOrThrow).not.toHaveBeenCalled();
    expect(uploadGeneratedMediaFilesMock).toHaveBeenCalledWith(expect.objectContaining({
      filesByQuality: { low: file },
      mediaType: "video",
      original: file,
    }), { scene: 1 });
    expect(uploadMediaFile).not.toHaveBeenCalled();
    expect(result.url).toBe("https://media.tuan.chat/media/v1/files/043/43/video/low.webm");
    expect(result.fileId).toBe(43);
  });

  it("转码发生 wasm OOM 时回退原视频再交给媒体服务", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(2048)], "sample.mkv", { type: "video/x-matroska" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const transcodeMock = transcodeVideoFileToWebmOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockRejectedValueOnce(new Error("RuntimeError: memory access out of bounds"));
    const uploadGeneratedMediaFilesMock = uploadGeneratedMediaFiles as ReturnType<typeof vi.fn>;
    uploadGeneratedMediaFilesMock.mockResolvedValueOnce({
      fileId: 44,
      mediaType: "video",
      uploadRequired: true,
    });

    const result = await utils.uploadVideo(file, 1);

    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    expect(uploadGeneratedMediaFilesMock).toHaveBeenCalledWith(expect.objectContaining({
      filesByQuality: { low: file },
      mediaType: "video",
      original: file,
    }), { scene: 1 });
    expect(uploadMediaFile).not.toHaveBeenCalled();
    expect(result.url).toBe("https://media.tuan.chat/media/v1/files/044/44/video/low.webm");
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

  it("音频上传只转码一次，并直接上传准备好的 low 文件", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(4096)], "voice.mp3", { type: "audio/mpeg" });
    const transcodedFile = new File([new Uint8Array(512)], "voice.webm", { type: "audio/webm" });
    const transcodeMock = transcodeAudioFileToOpusOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockResolvedValueOnce(transcodedFile);
    const uploadGeneratedMediaFilesMock = uploadGeneratedMediaFiles as ReturnType<typeof vi.fn>;
    uploadGeneratedMediaFilesMock.mockResolvedValueOnce({
      fileId: 46,
      mediaType: "audio",
      uploadRequired: true,
    });

    const result = await utils.uploadAudioAsset(file, 1);

    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(uploadGeneratedMediaFilesMock).toHaveBeenCalledWith(expect.objectContaining({
      filesByQuality: { low: transcodedFile },
      mediaType: "audio",
      original: transcodedFile,
    }), { scene: 1 });
    expect(uploadMediaFile).not.toHaveBeenCalled();
    expect(result.url).toBe("https://media.tuan.chat/media/v1/files/046/46/audio/low.webm");
  });

  it("音频转码失败时回退上传原音频，不再二次触发转码", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(4096)], "voice.mp3", { type: "audio/mpeg" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const transcodeMock = transcodeAudioFileToOpusOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockRejectedValueOnce(new Error("RuntimeError: memory access out of bounds"));
    const uploadGeneratedMediaFilesMock = uploadGeneratedMediaFiles as ReturnType<typeof vi.fn>;
    uploadGeneratedMediaFilesMock.mockResolvedValueOnce({
      fileId: 47,
      mediaType: "audio",
      uploadRequired: true,
    });

    const result = await utils.uploadAudioAsset(file, 1);

    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    expect(uploadGeneratedMediaFilesMock).toHaveBeenCalledWith(expect.objectContaining({
      filesByQuality: { low: file },
      mediaType: "audio",
      original: file,
    }), { scene: 1 });
    expect(uploadMediaFile).not.toHaveBeenCalled();
    expect(result.url).toBe("https://media.tuan.chat/media/v1/files/047/47/audio/low.webm");
    warnSpy.mockRestore();
  });

  it("图片上传通过媒体服务返回可用中档位地址", async () => {
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
    expect(result).toBe("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp");
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

