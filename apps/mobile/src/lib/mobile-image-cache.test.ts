import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCachedImageUriSync,
  getCacheKey,
  isAlreadyCached,
  prefetchImage,
  prefetchImages,
  resetCache,
  resolveCachedImageUri,
} from "./mobile-image-cache";

const fileSystemMock = vi.hoisted(() => {
  const existingDirectories = new Set<string>(["file:///mock/cache", "file:///mock/document"]);
  const existingFiles = new Set<string>();
  const fileContents = new Map<string, string>();

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
  }

  class MockFile {
    static downloadFileAsync = vi.fn(async (_url: string, destination: MockFile) => {
      existingFiles.add(destination.uri);
      return { uri: destination.uri };
    });

    readonly uri: string;

    constructor(...parts: (string | { uri: string })[]) {
      this.uri = joinUri(...parts);
    }

    get exists() {
      return existingFiles.has(this.uri);
    }

    delete() {
      existingFiles.delete(this.uri);
      fileContents.delete(this.uri);
    }

    textSync() {
      const content = fileContents.get(this.uri);
      if (content == null) {
        throw new Error("File does not exist");
      }
      return content;
    }

    write(content: string) {
      existingFiles.add(this.uri);
      fileContents.set(this.uri, content);
    }
  }

  return {
    existingDirectories,
    existingFiles,
    fileContents,
    MockDirectory,
    MockFile,
  };
});

const mockPrefetch = vi.hoisted(() => vi.fn<(url: string, options?: { cachePolicy?: string }) => Promise<boolean>>());

vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

vi.mock("expo-file-system", () => ({
  Directory: fileSystemMock.MockDirectory,
  File: fileSystemMock.MockFile,
  Paths: {
    get cache() {
      return new fileSystemMock.MockDirectory("file:///mock/cache");
    },
    get document() {
      return new fileSystemMock.MockDirectory("file:///mock/document");
    },
  },
}));

vi.mock("expo-image", () => ({
  Image: {
    prefetch: (...args: Parameters<typeof mockPrefetch>) => mockPrefetch(...args),
  },
}));

const LOW_URL = "https://media.tuan.chat/media/v1/files/007/7/image/low.webp";
const MEDIUM_URL = "https://media.tuan.chat/media/v1/files/007/7/image/medium.webp";
const ORIGINAL_URL = "https://media.tuan.chat/media/v1/files/007/7/original";
const LOW_FILE_URI = "file:///mock/document/mobile-image-cache/7_low.webp";
const ORIGINAL_FILE_URI = "file:///mock/document/mobile-image-cache/7_original.img";

beforeEach(() => {
  resetCache();
  fileSystemMock.existingDirectories.clear();
  fileSystemMock.existingDirectories.add("file:///mock/cache");
  fileSystemMock.existingDirectories.add("file:///mock/document");
  fileSystemMock.existingFiles.clear();
  fileSystemMock.fileContents.clear();
  fileSystemMock.MockFile.downloadFileAsync.mockClear();
  fileSystemMock.MockFile.downloadFileAsync.mockImplementation(async (_url: string, destination: InstanceType<typeof fileSystemMock.MockFile>) => {
    fileSystemMock.existingFiles.add(destination.uri);
    return { uri: destination.uri };
  });
  mockPrefetch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("getCacheKey", () => {
  it("extracts fileId and quality from media URL", () => {
    expect(getCacheKey(LOW_URL)).toBe("7_low");
    expect(getCacheKey("https://media.tuan.chat/media/v1/files/123/123456/image/medium.webp")).toBe("123456_medium");
    expect(getCacheKey("https://media.tuan.chat/media/v1/files/001/1/image/high.webp")).toBe("1_high");
    expect(getCacheKey("https://media.tuan.chat/media/v1/files/001/1/original")).toBe("1_original");
  });

  it("returns URL as-is for non-media URLs", () => {
    const url = "https://example.com/avatar.png";
    expect(getCacheKey(url)).toBe(url);
  });

  it("normalizes media URLs with different query strings to the same cache key", () => {
    const a = "https://media.tuan.chat/media/v1/files/007/7/image/low.webp?token=a";
    const b = "https://media.tuan.chat/media/v1/files/007/7/image/low.webp?token=b";
    expect(getCacheKey(a)).toBe("7_low");
    expect(getCacheKey(b)).toBe("7_low");
  });
});

describe("native disk cache", () => {
  it("downloads a new URL into a stable cache file", async () => {
    const result = await prefetchImage(LOW_URL);

    expect(result).toBe(true);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledTimes(1);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledWith(
      LOW_URL,
      expect.objectContaining({ uri: LOW_FILE_URI }),
      { idempotent: true },
    );
    expect(getCachedImageUriSync(LOW_URL)).toBe(LOW_FILE_URI);
    expect(isAlreadyCached(LOW_URL)).toBe(true);
  });

  it("returns the local file URI when resolving an uncached remote image", async () => {
    expect(getCachedImageUriSync(LOW_URL)).toBeNull();

    const resolvedUri = await resolveCachedImageUri(LOW_URL);

    expect(resolvedUri).toBe(LOW_FILE_URI);
    expect(getCachedImageUriSync(LOW_URL)).toBe(LOW_FILE_URI);
  });

  it("falls back to original when the requested derivative is missing", async () => {
    fileSystemMock.MockFile.downloadFileAsync.mockImplementation(async (url: string, destination: InstanceType<typeof fileSystemMock.MockFile>) => {
      if (url === LOW_URL) {
        throw new Error("404 derivative missing");
      }
      fileSystemMock.existingFiles.add(destination.uri);
      return { uri: destination.uri };
    });

    const resolvedUri = await resolveCachedImageUri(LOW_URL);

    expect(resolvedUri).toBe(ORIGINAL_FILE_URI);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledTimes(2);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenNthCalledWith(
      1,
      LOW_URL,
      expect.objectContaining({ uri: LOW_FILE_URI }),
      { idempotent: true },
    );
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenNthCalledWith(
      2,
      ORIGINAL_URL,
      expect.objectContaining({ uri: ORIGINAL_FILE_URI }),
      { idempotent: true },
    );
    expect(getCachedImageUriSync(LOW_URL)).toBe(ORIGINAL_FILE_URI);
    expect(isAlreadyCached(LOW_URL)).toBe(true);
  });

  it("persists derivative missing status and reuses original for the same media file", async () => {
    fileSystemMock.MockFile.downloadFileAsync.mockImplementation(async (url: string, destination: InstanceType<typeof fileSystemMock.MockFile>) => {
      if (url === LOW_URL) {
        throw new Error("404 derivative missing");
      }
      fileSystemMock.existingFiles.add(destination.uri);
      return { uri: destination.uri };
    });

    await resolveCachedImageUri(LOW_URL);
    resetCache({ clearPersistent: false });
    fileSystemMock.MockFile.downloadFileAsync.mockClear();

    expect(getCachedImageUriSync(MEDIUM_URL)).toBe(ORIGINAL_FILE_URI);

    const resolvedUri = await resolveCachedImageUri(MEDIUM_URL);

    expect(resolvedUri).toBe(ORIGINAL_FILE_URI);
    expect(fileSystemMock.MockFile.downloadFileAsync).not.toHaveBeenCalled();
  });

  it("does not redownload an already cached URL", async () => {
    await prefetchImage(LOW_URL);
    fileSystemMock.MockFile.downloadFileAsync.mockClear();

    const result = await prefetchImage(LOW_URL);

    expect(result).toBe(true);
    expect(fileSystemMock.MockFile.downloadFileAsync).not.toHaveBeenCalled();
  });

  it("reuses in-flight downloads for concurrent calls to same URL", async () => {
    fileSystemMock.MockFile.downloadFileAsync.mockImplementation(
      async (_url: string, destination: InstanceType<typeof fileSystemMock.MockFile>) => new Promise(resolve => setTimeout(() => {
        fileSystemMock.existingFiles.add(destination.uri);
        resolve({ uri: destination.uri });
      }, 50)),
    );

    const [r1, r2, r3] = await Promise.all([
      prefetchImage(LOW_URL),
      prefetchImage(LOW_URL),
      prefetchImage(LOW_URL),
    ]);

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(r3).toBe(true);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledTimes(1);
  });

  it("treats query-string variants of the same media file as one local cache entry", async () => {
    const firstUrl = `${LOW_URL}?token=a`;
    const secondUrl = `${LOW_URL}?token=b`;

    await prefetchImage(firstUrl);
    fileSystemMock.MockFile.downloadFileAsync.mockClear();

    const resolvedUri = await resolveCachedImageUri(secondUrl);

    expect(resolvedUri).toBe(LOW_FILE_URI);
    expect(fileSystemMock.MockFile.downloadFileAsync).not.toHaveBeenCalled();
  });

  it("backs off failed downloads for the TTL duration", async () => {
    fileSystemMock.MockFile.downloadFileAsync.mockRejectedValue(new Error("network error"));

    const r1 = await prefetchImage(LOW_URL);
    expect(r1).toBe(false);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledTimes(2);

    fileSystemMock.MockFile.downloadFileAsync.mockClear();
    const r2 = await prefetchImage(LOW_URL);
    expect(r2).toBe(false);
    expect(fileSystemMock.MockFile.downloadFileAsync).not.toHaveBeenCalled();
  });

  it("retries failed URL after backoff TTL expires", async () => {
    vi.useFakeTimers();
    fileSystemMock.MockFile.downloadFileAsync.mockRejectedValue(new Error("network error"));

    await prefetchImage(LOW_URL);
    fileSystemMock.MockFile.downloadFileAsync.mockClear();
    fileSystemMock.MockFile.downloadFileAsync.mockImplementation(async (_url: string, destination: InstanceType<typeof fileSystemMock.MockFile>) => {
      fileSystemMock.existingFiles.add(destination.uri);
      return { uri: destination.uri };
    });

    vi.advanceTimersByTime(31_000);

    const result = await prefetchImage(LOW_URL);
    expect(result).toBe(true);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledTimes(1);
  });
});

describe("prefetchImages", () => {
  it("prefetches only URLs not already cached", async () => {
    const url2 = "https://media.tuan.chat/media/v1/files/012/12/image/low.webp";

    await prefetchImage(LOW_URL);
    fileSystemMock.MockFile.downloadFileAsync.mockClear();

    await prefetchImages([LOW_URL, url2]);

    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledTimes(1);
    expect(fileSystemMock.MockFile.downloadFileAsync).toHaveBeenCalledWith(
      url2,
      expect.objectContaining({ uri: "file:///mock/document/mobile-image-cache/12_low.webp" }),
      { idempotent: true },
    );
  });

  it("records successful URLs individually even when one fails", async () => {
    const url1 = LOW_URL;
    const url2 = "https://media.tuan.chat/media/v1/files/012/12/image/low.webp";
    const url3 = "https://media.tuan.chat/media/v1/files/099/99/image/low.webp";

    fileSystemMock.MockFile.downloadFileAsync.mockImplementation(async (url: string, destination: InstanceType<typeof fileSystemMock.MockFile>) => {
      if (url === url2 || url === "https://media.tuan.chat/media/v1/files/012/12/original")
        throw new Error("network error");
      fileSystemMock.existingFiles.add(destination.uri);
      return { uri: destination.uri };
    });

    await prefetchImages([url1, url2, url3]);

    expect(isAlreadyCached(url1)).toBe(true);
    expect(isAlreadyCached(url2)).toBe(false);
    expect(isAlreadyCached(url3)).toBe(true);
  });
});
