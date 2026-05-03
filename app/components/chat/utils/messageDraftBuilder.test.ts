import { vi } from "vitest";

import type { UploadUtils } from "@/utils/UploadUtils";

import { MessageType } from "../../../../api/wsModels";
import { buildMessageDraftsFromComposerSnapshot } from "./messageDraftBuilder";

function createUploadUtilsMock() {
  return {
    uploadImg: vi.fn(),
    uploadVideo: vi.fn(async (file: File) => ({
      url: `https://static.example.com/${file.name}`,
      fileName: file.name,
      size: file.size,
    })),
    uploadFile: vi.fn(async (file: File) => `https://static.example.com/${file.name}`),
    uploadAudio: vi.fn(),
  } as unknown as UploadUtils & {
    uploadVideo: ReturnType<typeof vi.fn>;
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
      value: vi.fn(() => "blob:media"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: {
        createElement: vi.fn((tagName: string) => {
          if (tagName === "video" || tagName === "audio") {
            return createMockMediaElement();
          }
          throw new Error(`Unexpected element request: ${tagName}`);
        }),
      },
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
        url: "https://static.example.com/clip.mp4",
        fileName: "clip.mp4",
        size: videoFile.size,
        second: 7,
      },
    });
    expect(uploadUtils.uploadVideo).toHaveBeenCalledTimes(1);
    expect(uploadUtils.uploadVideo).toHaveBeenCalledWith(videoFile, 1);
    expect(uploadUtils.uploadFile).not.toHaveBeenCalled();
  });

  it("表情消息会保留媒体 fileId 和 mediaType", async () => {
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
          originalUrl: "/media/v1/files/077/77/original",
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
        fileId: 77,
        mediaType: "image",
        url: emojiUrl,
        originalUrl: "/media/v1/files/077/77/original",
      },
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
});
