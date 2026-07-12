import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCachedMediaFileUriSync,
  getMediaFileCacheKey,
  resetMobileMediaFileCacheForTests,
  resolveCachedMediaFileUri,
} from "./mobile-media-file-cache";

const platformMock = vi.hoisted(() => ({
  OS: "ios",
}));

const fileSystemMock = vi.hoisted(() => {
  const existingDirectories = new Set<string>(["file:///mock/document"]);
  const existingFiles = new Map<string, { modificationTime: number; size: number }>();
  let defaultModificationTime = Date.now();
  let defaultSize = 1_024;

  function getUriPart(part: string | { uri: string }): string {
    return typeof part === "string" ? part : part.uri;
  }

  function joinUri(...parts: (string | { uri: string })[]): string {
    const values = parts.map(getUriPart).filter(Boolean);
    return values
      .map((value, index) => index === 0 ? value.replace(/\/+$/, "") : value.replace(/^\/+|\/+$/g, ""))
      .join("/");
  }

  class MockDirectory {
    readonly uri: string;

    constructor(...parts: (string | { uri: string })[]) {
      this.uri = joinUri(...parts);
    }

    get exists() {
      return existingDirectories.has(this.uri);
    }

    create() {
      existingDirectories.add(this.uri);
    }

    list() {
      const prefix = `${this.uri.replace(/\/+$/, "")}/`;
      return [...existingFiles.keys()]
        .filter(uri => uri.startsWith(prefix) && !uri.slice(prefix.length).includes("/"))
        .map(uri => new MockFile(uri));
    }
  }

  class MockFile {
    static downloadFileAsync = vi.fn(async (_url: string, destination: MockFile) => {
      existingFiles.set(destination.uri, {
        modificationTime: defaultModificationTime,
        size: defaultSize,
      });
      return new MockFile(destination.uri);
    });

    readonly uri: string;

    constructor(...parts: (string | { uri: string })[]) {
      this.uri = joinUri(...parts);
    }

    get contentUri() {
      return `content://${encodeURIComponent(this.uri)}`;
    }

    get exists() {
      return existingFiles.has(this.uri);
    }

    get modificationTime() {
      return existingFiles.get(this.uri)?.modificationTime ?? null;
    }

    get size() {
      return existingFiles.get(this.uri)?.size ?? 0;
    }

    delete() {
      existingFiles.delete(this.uri);
    }
  }

  return {
    existingDirectories,
    existingFiles,
    MockDirectory,
    MockFile,
    setDefaultFileInfo(info: { modificationTime?: number; size?: number }) {
      defaultModificationTime = info.modificationTime ?? defaultModificationTime;
      defaultSize = info.size ?? defaultSize;
    },
    setFile(uri: string, info: { modificationTime: number; size: number }) {
      existingFiles.set(uri, info);
    },
  };
});

vi.mock("react-native", () => ({
  Platform: platformMock,
}));

vi.mock("expo-file-system", () => ({
  Directory: fileSystemMock.MockDirectory,
  File: fileSystemMock.MockFile,
  Paths: {
    get document() {
      return new fileSystemMock.MockDirectory("file:///mock/document");
    },
  },
}));

const VIDEO_URL = "https://media.tuan.chat/media/v1/files/007/7/video/low.webm";
const VIDEO_FILE_URI = "file:///mock/document/mobile-media-file-cache/7_video_low.webm";
const ORIGINAL_FILE_URL = "https://media.tuan.chat/media/v1/files/012/12/original";
const ORIGINAL_PDF_FILE_URI = "file:///mock/document/mobile-media-file-cache/12_file_original.pdf";

beforeEach(() => {
  platformMock.OS = "ios";
  resetMobileMediaFileCacheForTests();
  fileSystemMock.existingDirectories.clear();
  fileSystemMock.existingDirectories.add("file:///mock/document");
  fileSystemMock.existingFiles.clear();
  fileSystemMock.setDefaultFileInfo({ modificationTime: Date.now(), size: 1_024 });
  fileSystemMock.MockFile.downloadFileAsync.mockClear();
  fileSystemMock.MockFile.downloadFileAsync.mockImplementation(async (_url: string, destination: InstanceType<typeof fileSystemMock.MockFile>) => {
    fileSystemMock.existingFiles.set(destination.uri, {
      modificationTime: Date.now(),
      size: 1_024,
    });
    return new fileSystemMock.MockFile(destination.uri);
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("mobile media file cache", () => {
  it("creates stable media file cache keys", () => {
    expect(getMediaFileCacheKey(VIDEO_URL)).toBe("7_video_low");
    expect(getMediaFileCacheKey(`${VIDEO_URL}?token=a`)).toBe("7_video_low");
    expect(getMediaFileCacheKey(ORIGINAL_FILE_URL)).toBe("12_file_original");
  });

  it("downloads cache misses and returns local file uri", async () => {
    const uri = await resolveCachedMediaFileUri(VIDEO_URL);

    expect(uri).toBe(VIDEO_FILE_URI);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledTimes(1);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledWith(
      VIDEO_URL,
      expect.objectContaining({ uri: VIDEO_FILE_URI }),
      { idempotent: true },
    );
    expect(getCachedMediaFileUriSync(VIDEO_URL)).toBe(VIDEO_FILE_URI);
  });

  it("uses original file name extension for extensionless original media urls", async () => {
    const uri = await resolveCachedMediaFileUri(ORIGINAL_FILE_URL, { fileName: "handout.PDF" });

    expect(uri).toBe(ORIGINAL_PDF_FILE_URI);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledWith(
      ORIGINAL_FILE_URL,
      expect.objectContaining({ uri: ORIGINAL_PDF_FILE_URI }),
      { idempotent: true },
    );
    expect(getCachedMediaFileUriSync(ORIGINAL_FILE_URL, { fileName: "handout.PDF" })).toBe(ORIGINAL_PDF_FILE_URI);
  });

  it("应用运行时重启后继续使用永久缓存文件", async () => {
    await resolveCachedMediaFileUri(VIDEO_URL);
    resetMobileMediaFileCacheForTests();
    fileSystemMock.MockFile.downloadFileAsync.mockClear();

    await expect(resolveCachedMediaFileUri(VIDEO_URL)).resolves.toBe(VIDEO_FILE_URI);
    expect(fileSystemMock.MockFile.downloadFileAsync).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent downloads", async () => {
    fileSystemMock.MockFile.downloadFileAsync.mockImplementation(
      async (_url: string, destination: InstanceType<typeof fileSystemMock.MockFile>) => new Promise(resolve => setTimeout(() => {
        fileSystemMock.existingFiles.set(destination.uri, {
          modificationTime: Date.now(),
          size: 1_024,
        });
        resolve(new fileSystemMock.MockFile(destination.uri));
      }, 30)),
    );

    const [first, second, third] = await Promise.all([
      resolveCachedMediaFileUri(VIDEO_URL),
      resolveCachedMediaFileUri(VIDEO_URL),
      resolveCachedMediaFileUri(VIDEO_URL),
    ]);

    expect(first).toBe(VIDEO_FILE_URI);
    expect(second).toBe(VIDEO_FILE_URI);
    expect(third).toBe(VIDEO_FILE_URI);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledTimes(1);
  });

  it("deletes partial files and returns remote fallback after failed download", async () => {
    fileSystemMock.MockFile.downloadFileAsync.mockImplementation(async (_url: string, destination: InstanceType<typeof fileSystemMock.MockFile>) => {
      fileSystemMock.existingFiles.set(destination.uri, {
        modificationTime: 1_000,
        size: 128,
      });
      throw new Error("network error");
    });

    await expect(resolveCachedMediaFileUri(VIDEO_URL)).resolves.toBe(VIDEO_URL);
    expect(fileSystemMock.existingFiles.has(VIDEO_FILE_URI)).toBe(false);

    fileSystemMock.MockFile.downloadFileAsync.mockClear();
    await expect(resolveCachedMediaFileUri(VIDEO_URL)).resolves.toBe(VIDEO_URL);
    expect(fileSystemMock.MockFile.downloadFileAsync).not.toHaveBeenCalled();
  });

  it("can return null instead of remote fallback when configured", async () => {
    fileSystemMock.MockFile.downloadFileAsync.mockRejectedValue(new Error("network error"));

    await expect(resolveCachedMediaFileUri(VIDEO_URL, { fallbackToRemote: false })).resolves.toBeNull();
  });

  it("允许用户立即重试失败的永久缓存下载", async () => {
    fileSystemMock.MockFile.downloadFileAsync.mockRejectedValueOnce(new Error("network error"));
    await expect(resolveCachedMediaFileUri(VIDEO_URL, { fallbackToRemote: false })).resolves.toBeNull();

    await expect(resolveCachedMediaFileUri(VIDEO_URL, {
      fallbackToRemote: false,
      forceRetry: true,
    })).resolves.toBe(VIDEO_FILE_URI);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledTimes(2);
  });

  it("永久保留已经下载的大文件", async () => {
    fileSystemMock.existingDirectories.add("file:///mock/document/mobile-media-file-cache");
    fileSystemMock.setFile(VIDEO_FILE_URI, {
      modificationTime: 1_000,
      size: 1024 * 1024 * 1024,
    });

    await expect(resolveCachedMediaFileUri(VIDEO_URL, { now: Date.now() })).resolves.toBe(VIDEO_FILE_URI);
    expect(fileSystemMock.MockFile.downloadFileAsync).not.toHaveBeenCalled();
    expect(fileSystemMock.existingFiles.has(VIDEO_FILE_URI)).toBe(true);
  });

  it("falls back directly on web, local URIs, and non-remote values", async () => {
    platformMock.OS = "web";

    await expect(resolveCachedMediaFileUri(VIDEO_URL)).resolves.toBe(VIDEO_URL);
    expect(fileSystemMock.MockFile.downloadFileAsync).not.toHaveBeenCalled();

    platformMock.OS = "ios";
    await expect(resolveCachedMediaFileUri("file:///tmp/audio.webm")).resolves.toBe("file:///tmp/audio.webm");
    await expect(resolveCachedMediaFileUri("about:blank")).resolves.toBe("about:blank");
  });

  it("returns Android content URI for cached files", () => {
    platformMock.OS = "android";
    fileSystemMock.existingDirectories.add("file:///mock/document/mobile-media-file-cache");
    fileSystemMock.setFile(VIDEO_FILE_URI, {
      modificationTime: Date.now(),
      size: 1_024,
    });

    expect(getCachedMediaFileUriSync(VIDEO_URL)).toBe(`content://${encodeURIComponent(VIDEO_FILE_URI)}`);
  });
});
