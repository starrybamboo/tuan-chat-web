import { beforeEach, describe, expect, it, vi } from "vitest";

import { tuanchat } from "../../api/instance";
import { UploadUtils } from "./UploadUtils";
import { transcodeVideoFileToWebmOrThrow } from "./videoTranscodeUtils";

vi.mock("../../api/instance", () => ({
  tuanchat: {
    ossController: {
      getUploadUrl: vi.fn(),
    },
  },
}));

vi.mock("./videoTranscodeUtils", () => ({
  transcodeVideoFileToWebmOrThrow: vi.fn(),
}));

describe("uploadUtils.uploadVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as any).__TC_VIDEO_UPLOAD_ENABLE_TRANSCODE;
  });

  it("默认启用转码：mp4 会转成 webm 上传", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(1024)], "clip.mp4", { type: "video/mp4" });
    const transcodedFile = new File([new Uint8Array(256)], "clip.webm", { type: "video/webm" });
    const transcodeMock = transcodeVideoFileToWebmOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockResolvedValueOnce(transcodedFile);

    const getUploadUrlMock = (tuanchat as any).ossController.getUploadUrl as ReturnType<typeof vi.fn>;
    getUploadUrlMock.mockResolvedValue({
      data: {
        uploadUrl: "https://upload.example/video",
        downloadUrl: "https://cdn.example/video.webm",
      },
    });

    const hashSpy = vi.spyOn(utils as any, "calculateFileHash").mockResolvedValue("hash_webm");
    const uploadSpy = vi.spyOn(utils as any, "executeUpload").mockResolvedValue(undefined);

    const result = await utils.uploadVideo(file, 1);

    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(hashSpy).toHaveBeenCalledWith(transcodedFile);
    expect(getUploadUrlMock).toHaveBeenCalledWith({
      fileName: `hash_webm_${transcodedFile.size}.webm`,
      scene: 1,
      dedupCheck: true,
    });
    expect(uploadSpy).toHaveBeenCalledWith("https://upload.example/video", transcodedFile);
    expect(result).toEqual({
      url: "https://cdn.example/video.webm",
      fileName: "clip.webm",
      size: transcodedFile.size,
    });
  });

  it("显式关闭浏览器视频转码时，mkv 走直传", async () => {
    (globalThis as any).__TC_VIDEO_UPLOAD_ENABLE_TRANSCODE = false;
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(4096)], "movie.mkv", { type: "video/x-matroska" });

    const getUploadUrlMock = (tuanchat as any).ossController.getUploadUrl as ReturnType<typeof vi.fn>;
    getUploadUrlMock.mockResolvedValue({
      data: {
        uploadUrl: "https://upload.example/video-direct",
        downloadUrl: "https://cdn.example/video-direct.mkv",
      },
    });

    vi.spyOn(utils as any, "calculateFileHash").mockResolvedValue("hash_direct");
    const uploadSpy = vi.spyOn(utils as any, "executeUpload").mockResolvedValue(undefined);

    const result = await utils.uploadVideo(file, 1);

    expect(transcodeVideoFileToWebmOrThrow).not.toHaveBeenCalled();
    expect(getUploadUrlMock).toHaveBeenCalledWith({
      fileName: `hash_direct_${file.size}.mkv`,
      scene: 1,
      dedupCheck: true,
    });
    expect(uploadSpy).toHaveBeenCalledWith("https://upload.example/video-direct", file);
    expect(result).toEqual({
      url: "https://cdn.example/video-direct.mkv",
      fileName: "movie.mkv",
      size: file.size,
    });
  });

  it("转码发生 wasm OOM 时回退原视频上传并保留原扩展名", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(2048)], "sample.mkv", { type: "video/x-matroska" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const transcodeMock = transcodeVideoFileToWebmOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockRejectedValueOnce(new Error("RuntimeError: memory access out of bounds"));

    const getUploadUrlMock = (tuanchat as any).ossController.getUploadUrl as ReturnType<typeof vi.fn>;
    getUploadUrlMock.mockResolvedValue({
      data: {
        uploadUrl: "https://upload.example/video2",
        downloadUrl: "https://cdn.example/video2.mkv",
      },
    });

    vi.spyOn(utils as any, "calculateFileHash").mockResolvedValue("hash_oom");
    const uploadSpy = vi.spyOn(utils as any, "executeUpload").mockResolvedValue(undefined);

    const result = await utils.uploadVideo(file, 1);

    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(getUploadUrlMock).toHaveBeenCalledWith({
      fileName: `hash_oom_${file.size}.mkv`,
      scene: 1,
      dedupCheck: true,
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(uploadSpy).toHaveBeenCalledWith("https://upload.example/video2", file);
    expect(result).toEqual({
      url: "https://cdn.example/video2.mkv",
      fileName: "sample.mkv",
      size: file.size,
    });
    warnSpy.mockRestore();
  });

  it("非 OOM 的转码失败继续抛错，不回退", async () => {
    const utils = new UploadUtils();
    const file = new File([new Uint8Array(1024)], "broken.mkv", { type: "video/x-matroska" });

    const transcodeMock = transcodeVideoFileToWebmOrThrow as ReturnType<typeof vi.fn>;
    transcodeMock.mockRejectedValueOnce(new Error("transcode failed"));

    const getUploadUrlMock = (tuanchat as any).ossController.getUploadUrl as ReturnType<typeof vi.fn>;
    vi.spyOn(utils as any, "calculateFileHash").mockResolvedValue("hash_fail");
    vi.spyOn(utils as any, "executeUpload").mockResolvedValue(undefined);

    await expect(utils.uploadVideo(file, 1)).rejects.toThrow("transcode failed");
    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(getUploadUrlMock).not.toHaveBeenCalled();
  });
});
