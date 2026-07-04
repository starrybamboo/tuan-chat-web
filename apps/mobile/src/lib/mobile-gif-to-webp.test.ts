import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const platformMock = vi.hoisted(() => ({
  OS: "ios",
}));

const fileSystemMock = vi.hoisted(() => ({
  bytes: vi.fn(),
  cachePath: "file:///cache/",
  write: vi.fn(),
}));

const assetMock = vi.hoisted(() => ({
  fromModule: vi.fn(() => ({
    downloadAsync: vi.fn(async () => undefined),
    localUri: "file:///bundle/webp-wasm.wasm",
    uri: "file:///bundle/webp-wasm.wasm",
  })),
}));

const gifuctMock = vi.hoisted(() => ({
  parseGIF: vi.fn(),
  decompressFrames: vi.fn(),
}));

const webpWasmMock = vi.hoisted(() => ({
  createWebpModule: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: platformMock,
}));

vi.mock("expo-file-system", () => ({
  File: class {
    uri: string;

    constructor(...parts: Array<string | { uri: string }>) {
      const normalized = parts.map(part => typeof part === "string" ? part : part.uri);
      this.uri = normalized.length === 1
        ? normalized[0]!
        : `${normalized[0]!.replace(/\/?$/, "/")}${normalized.slice(1).join("/")}`;
    }

    bytes() {
      return fileSystemMock.bytes(this.uri);
    }

    write(bytes: Uint8Array) {
      fileSystemMock.write(this.uri, bytes);
    }
  },
  Paths: {
    cache: { uri: fileSystemMock.cachePath },
  },
}));

vi.mock("expo-asset", () => ({
  Asset: assetMock,
}));

vi.mock("gifuct-js", () => ({
  decompressFrames: gifuctMock.decompressFrames,
  parseGIF: gifuctMock.parseGIF,
}));

vi.mock("wasm-webp/dist/esm/webp-wasm", () => ({
  default: webpWasmMock.createWebpModule,
}));

vi.mock("wasm-webp/dist/esm/webp-wasm.wasm", () => ({
  default: 123,
}));

function base64(bytes: number[]): string {
  return Buffer.from(bytes).toString("base64");
}

function patchPixel(r: number, g: number, b: number, a = 255) {
  return new Uint8ClampedArray([r, g, b, a]);
}

type MockAnimationFrameVector = {
  frames: Array<{ data: Uint8Array }>;
};

describe("mobile gif to webp", () => {
  let encodedFrameData: Uint8Array[];

  beforeEach(() => {
    encodedFrameData = [];
    vi.resetModules();
    platformMock.OS = "ios";
    fileSystemMock.bytes.mockReset();
    fileSystemMock.write.mockReset();
    assetMock.fromModule.mockClear();
    gifuctMock.parseGIF.mockReset();
    gifuctMock.decompressFrames.mockReset();
    webpWasmMock.createWebpModule.mockReset();
    fileSystemMock.bytes.mockImplementation(async (uri: string) => {
      return uri.includes("webp-wasm") ? new Uint8Array([0, 97, 115, 109]) : new Uint8Array([71, 73, 70, 56]);
    });
    gifuctMock.parseGIF.mockReturnValue({
      lsd: { width: 2, height: 1 },
    });
    gifuctMock.decompressFrames.mockReturnValue([
      {
        delay: 50,
        disposalType: 1,
        dims: { left: 0, top: 0, width: 1, height: 1 },
        patch: patchPixel(255, 0, 0),
      },
      {
        delay: 60,
        disposalType: 2,
        dims: { left: 1, top: 0, width: 1, height: 1 },
        patch: patchPixel(0, 0, 255),
      },
    ]);
    webpWasmMock.createWebpModule.mockResolvedValue({
      VectorWebPAnimationFrame: class {
        frames: unknown[] = [];
        push_back(frame: unknown) {
          this.frames.push(frame);
        }
        delete() {}
      },
      encodeAnimation: vi.fn((_width: number, _height: number, _hasAlpha: boolean, frames: MockAnimationFrameVector) => {
        encodedFrameData = frames.frames.map(frame => frame.data.slice());
        return new Uint8Array([82, 73, 70, 70]);
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("detects gif by mime type or extension", async () => {
    const { isGifAttachment } = await import("./mobile-gif-to-webp");

    expect(isGifAttachment({ fileName: "emoji.gif", mimeType: "application/octet-stream" })).toBe(true);
    expect(isGifAttachment({ fileName: "emoji.png", mimeType: "image/gif" })).toBe(true);
    expect(isGifAttachment({ fileName: "emoji.png", mimeType: "image/png" })).toBe(false);
  });

  it("converts gif frames to animated webp cache file", async () => {
    const { convertGifAttachmentToAnimatedWebp } = await import("./mobile-gif-to-webp");

    const result = await convertGifAttachmentToAnimatedWebp({
      fileName: "funny.gif",
      uri: "file:///tmp/funny.gif",
    });

    expect(result).toEqual({
      fileName: "funny.webp",
      mimeType: "image/webp",
      size: 4,
      uri: expect.stringMatching(/^file:\/\/\/cache\/animated-webp-\d+-funny\.webp$/),
    });
    expect(encodedFrameData[0]).toEqual(new Uint8Array([255, 0, 0, 255, 0, 0, 0, 0]));
    expect(encodedFrameData[1]).toEqual(new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]));
    expect(gifuctMock.parseGIF).toHaveBeenCalled();
    expect(gifuctMock.decompressFrames).toHaveBeenCalledWith(expect.objectContaining({
      lsd: { width: 2, height: 1 },
    }), true);
    expect(webpWasmMock.createWebpModule).toHaveBeenCalledWith({
      wasmBinary: new Uint8Array([0, 97, 115, 109]),
    });
    expect(fileSystemMock.write).toHaveBeenCalledWith(
      result.uri,
      new Uint8Array([82, 73, 70, 70]),
    );
  });

  it("throws when animated webp remains over the original size limit", async () => {
    webpWasmMock.createWebpModule.mockResolvedValue({
      VectorWebPAnimationFrame: class {
        push_back() {}
        delete() {}
      },
      encodeAnimation: vi.fn(() => new Uint8Array(4 * 1024 * 1024)),
    });
    const { convertGifAttachmentToAnimatedWebp } = await import("./mobile-gif-to-webp");

    await expect(convertGifAttachmentToAnimatedWebp({
      fileName: "huge.gif",
      uri: "file:///tmp/huge.gif",
    })).rejects.toThrow("GIF 动图转 WebP 后仍超过 3MB。");
    expect(fileSystemMock.write).not.toHaveBeenCalled();
  });
});
