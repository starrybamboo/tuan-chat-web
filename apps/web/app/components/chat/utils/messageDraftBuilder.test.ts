import { vi } from "vitest";

import type { UploadUtils } from "@/utils/UploadUtils";

import { MessageType } from "../../../../api/wsModels";
import { buildMessageDraftsFromComposerSnapshot, resolveEmojiImageMeta } from "./messageDraftBuilder";

const { getImageSizeMock } = vi.hoisted(() => ({
  getImageSizeMock: vi.fn(),
}));

vi.mock("@/utils/getImgSize", () => ({
  getImageSize: getImageSizeMock,
}));

function createUploadUtilsMock() {
  return {
    uploadDualImage: vi.fn<(...args: any[]) => any>(async (file: File) => ({
      fileId: file.name === "a.png" ? 101 : 202,
      mediaType: "image",
      originalSize: file.size,
      originalUrl: `https://example.com/${file.name}/original`,
      url: `https://example.com/${file.name}/medium`,
    })),
    uploadImg: vi.fn<(...args: any[]) => any>(),
    uploadVideo: vi.fn<(...args: any[]) => any>(async (file: File) => ({
      fileId: 456,
      fileName: file.name,
      mediaType: "video",
      size: file.size,
    })),
    uploadAudioAsset: vi.fn<(...args: any[]) => any>(async (file: File) => ({
      fileId: 123,
      mediaType: "audio",
      fileName: file.name,
      size: file.size,
    })),
    uploadFile: vi.fn<(...args: any[]) => any>(async (file: File) => `https://static.example.com/${file.name}`),
    uploadAudio: vi.fn<(...args: any[]) => any>(),
  } as unknown as UploadUtils & {
    uploadDualImage: ReturnType<typeof vi.fn>;
    uploadVideo: ReturnType<typeof vi.fn>;
    uploadAudioAsset: ReturnType<typeof vi.fn>;
    uploadFile: ReturnType<typeof vi.fn>;
  };
}

function createMockMediaElement(duration = 7) {
  let hasSrc = false;
  let loadedHandler: (() => void) | null = null;

  return {
    duration,
    preload: "",
    onerror: null,
    set src(_value: string) {
      hasSrc = true;
      if (loadedHandler) {
        queueMicrotask(() => loadedHandler?.());
      }
    },
    get src() {
      return "";
    },
    get onloadedmetadata() {
      return loadedHandler;
    },
    set onloadedmetadata(handler: (() => void) | null) {
      loadedHandler = handler;
      if (hasSrc && handler) {
        queueMicrotask(() => handler());
      }
    },
  };
}

describe("messageDraftBuilder", () => {
  const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  const originalDocument = globalThis.document;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn<(...args: any[]) => any>(() => "blob:media"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn<(...args: any[]) => any>(),
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: {
        createElement: vi.fn<(...args: any[]) => any>((tagName: string) => {
          if (tagName === "video" || tagName === "audio") {
            return createMockMediaElement();
          }
          throw new Error(`Unexpected element request: ${tagName}`);
        }),
      },
    });
    getImageSizeMock.mockImplementation(async (input: File | string) => {
      const name = typeof input === "string" ? input : input.name;
      if (name === "a.png") {
        return { width: 800, height: 600, size: 1234 };
      }
      if (name === "b.png") {
        return { width: 640, height: 480, size: 2345 };
      }
      return { width: 128, height: 96, size: 2048 };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", originalCreateObjectURL);
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectURL);
    }
    if (originalDocument) {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        writable: true,
        value: originalDocument,
      });
      return;
    }
    delete (globalThis as { document?: Document }).document;
  });

  it("仅有普通文件附件时不会再生成 FILE 消息", async () => {
    const uploadUtils = createUploadUtilsMock();
    const pdfFile = new File(["pdf"], "notes.pdf", { type: "application/pdf" });

    const drafts = await buildMessageDraftsFromComposerSnapshot({
      inputText: "",
      imgFiles: [],
      emojiUrls: [],
      emojiMetaByUrl: {},
      fileAttachments: [pdfFile],
      audioFile: null,
      composerAnnotations: [],
      tempAnnotations: [],
      uploadUtils,
    });

    expect(drafts).toEqual([]);
    expect(uploadUtils.uploadVideo).not.toHaveBeenCalled();
    expect(uploadUtils.uploadFile).not.toHaveBeenCalled();
  });

  it("视频附件仍会生成 VIDEO 消息，并忽略混入的普通文件", async () => {
    const uploadUtils = createUploadUtilsMock();
    const videoFile = new File(["video"], "clip.mp4", { type: "video/mp4" });
    const pdfFile = new File(["pdf"], "notes.pdf", { type: "application/pdf" });

    const drafts = await buildMessageDraftsFromComposerSnapshot({
      inputText: "",
      imgFiles: [],
      emojiUrls: [],
      emojiMetaByUrl: {},
      fileAttachments: [videoFile, pdfFile],
      audioFile: null,
      composerAnnotations: [],
      tempAnnotations: [],
      uploadUtils,
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.messageType).toBe(MessageType.VIDEO);
    expect(drafts[0]?.extra).toMatchObject({
      videoMessage: {
        source: { kind: "internal", fileId: 456 },
        fileName: "clip.mp4",
        size: videoFile.size,
        second: 7,
      },
    });
    expect(uploadUtils.uploadVideo).toHaveBeenCalledTimes(1);
    expect(uploadUtils.uploadVideo).toHaveBeenCalledWith(videoFile, 1);
    expect(uploadUtils.uploadFile).not.toHaveBeenCalled();
  });

  it("多张图片会并行上传并保持草稿顺序", async () => {
    const uploadUtils = createUploadUtilsMock();
    const fileA = new File(["a"], "a.png", { type: "image/png" });
    const fileB = new File(["b"], "b.png", { type: "image/png" });
    const resolvers = new Map<string, (value: any) => void>();

    uploadUtils.uploadDualImage.mockImplementation((file: File) => {
      return new Promise((resolve) => {
        resolvers.set(file.name, resolve);
      });
    });

    const draftsPromise = buildMessageDraftsFromComposerSnapshot({
      inputText: "",
      imgFiles: [fileA, fileB],
      emojiUrls: [],
      emojiMetaByUrl: {},
      fileAttachments: [],
      audioFile: null,
      composerAnnotations: [],
      tempAnnotations: [],
      uploadUtils,
    });

    await Promise.resolve();
    expect(uploadUtils.uploadDualImage).toHaveBeenCalledTimes(2);
    expect(uploadUtils.uploadDualImage).toHaveBeenNthCalledWith(1, fileA, 1);
    expect(uploadUtils.uploadDualImage).toHaveBeenNthCalledWith(2, fileB, 1);

    resolvers.get("a.png")?.({
      fileId: 101,
      mediaType: "image",
      originalSize: fileA.size,
      originalUrl: "https://example.com/a.png/original",
      url: "https://example.com/a.png/medium",
    });
    resolvers.get("b.png")?.({
      fileId: 202,
      mediaType: "image",
      originalSize: fileB.size,
      originalUrl: "https://example.com/b.png/original",
      url: "https://example.com/b.png/medium",
    });

    const drafts = await draftsPromise;

    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.extra).toMatchObject({
      imageMessage: {
        source: { kind: "internal", fileId: 101 },
        fileName: "a.png",
        width: 800,
        height: 600,
        size: 1234,
      },
    });
    expect(drafts[1]?.extra).toMatchObject({
      imageMessage: {
        source: { kind: "internal", fileId: 202 },
        fileName: "b.png",
        width: 640,
        height: 480,
        size: 2345,
      },
    });
  });

  it("表情消息会保留内部媒体 source", async () => {
    const uploadUtils = createUploadUtilsMock();
    const emojiUrl = "/media/v1/files/077/77/image/low.webp";

    const drafts = await buildMessageDraftsFromComposerSnapshot({
      inputText: "",
      imgFiles: [],
      emojiUrls: [emojiUrl],
      emojiMetaByUrl: {
        [emojiUrl]: {
          fileId: 77,
          mediaType: "image",
          width: 128,
          height: 96,
          size: 2048,
          fileName: "ok.webp",
        },
      },
      fileAttachments: [],
      audioFile: null,
      composerAnnotations: [],
      tempAnnotations: [],
      uploadUtils,
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.extra).toMatchObject({
      imageMessage: {
        source: { kind: "internal", fileId: 77 },
      },
    });
  });

  it("表情缺少宽高时会用图片实际尺寸补齐", async () => {
    const emojiUrl = "/media/v1/files/077/77/image/medium.webp";

    await expect(resolveEmojiImageMeta({
      emojiUrl,
      meta: {
        fileId: 77,
        mediaType: "image",
        fileName: "old.webp",
      },
      measureImageSize: async () => ({ width: 320, height: 240, size: 4096 }),
    })).resolves.toEqual({
      fileId: 77,
      width: 320,
      height: 240,
      size: 4096,
      fileName: "old.webp",
    });
  });

  it("表情缺少宽高且测量失败时会补最小合法尺寸，避免发送校验卡死", async () => {
    const emojiUrl = "/media/v1/files/077/77/image/medium.webp";

    await expect(resolveEmojiImageMeta({
      emojiUrl,
      meta: {
        fileId: 77,
        mediaType: "image",
      },
      measureImageSize: async () => ({ width: -1, height: -1, size: -1 }),
    })).resolves.toEqual({
      fileId: 77,
      width: 1,
      height: 1,
      size: 1,
      fileName: "emoji",
    });
  });

  it("纯空白输入会保留原样生成文本草稿", async () => {
    const uploadUtils = createUploadUtilsMock();

    const drafts = await buildMessageDraftsFromComposerSnapshot({
      inputText: " \n\t ",
      imgFiles: [],
      emojiUrls: [],
      emojiMetaByUrl: {},
      fileAttachments: [],
      audioFile: null,
      composerAnnotations: [],
      tempAnnotations: [],
      uploadUtils,
    });

    expect(drafts).toEqual([expect.objectContaining({
      content: " \n\t ",
      messageType: MessageType.TEXT,
    })]);
  });

  it("真正空字符串不再生成空文本草稿", async () => {
    const uploadUtils = createUploadUtilsMock();

    const drafts = await buildMessageDraftsFromComposerSnapshot({
      inputText: "",
      imgFiles: [],
      emojiUrls: [],
      emojiMetaByUrl: {},
      fileAttachments: [],
      audioFile: null,
      composerAnnotations: [],
      tempAnnotations: [],
      uploadUtils,
    });

    expect(drafts).toEqual([]);
  });

  it("音频时长探测失败时不再补默认 1 秒", async () => {
    const uploadUtils = createUploadUtilsMock();
    const audioFile = new File(["audio"], "voice.webm", { type: "audio/webm" });

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: {
        createElement: vi.fn<(...args: any[]) => any>((tagName: string) => {
          if (tagName === "audio") {
            return createMockMediaElement(Number.NaN);
          }
          throw new Error(`Unexpected element request: ${tagName}`);
        }),
      },
    });

    await expect(buildMessageDraftsFromComposerSnapshot({
      inputText: "",
      imgFiles: [],
      emojiUrls: [],
      emojiMetaByUrl: {},
      fileAttachments: [],
      audioFile,
      composerAnnotations: [],
      tempAnnotations: [],
      uploadUtils,
    })).rejects.toThrow("无法读取音频时长");

    expect(uploadUtils.uploadAudioAsset).not.toHaveBeenCalled();
  });
});
