import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import MessageContentRenderer from "./messageContentRenderer";

vi.mock("@/components/common/betterImg", () => ({
  default: ({ src, size, zoomQuality }: { src: string | File; size?: { width?: number; height?: number }; zoomQuality?: string }) => {
    if (typeof File !== "undefined" && src instanceof File) {
      return createElement("img", {
        "data-local-file": src.name,
        "data-width": size?.width ?? "",
        "data-height": size?.height ?? "",
        "data-zoom-quality": zoomQuality ?? "",
      });
    }
    return createElement("img", { src, "data-width": size?.width ?? "", "data-height": size?.height ?? "", "data-zoom-quality": zoomQuality ?? "" });
  },
}));

const objectUrlMocks = vi.hoisted(() => ({
  createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
  revokeObjectURL: vi.fn(),
}));

vi.mock("@/components/chat/message/media/CachedVideoMessage", () => ({
  default: ({ url }: { url: string }) => createElement("video", { "data-video-url": url }),
}));

vi.mock("@/components/chat/message/media/AudioMessage", () => ({
  default: ({ url }: { url: string }) => createElement("div", { "data-audio-url": url }),
}));

describe("messageContentRenderer 聊天室媒体质量", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    objectUrlMocks.createObjectURL.mockClear();
    objectUrlMocks.revokeObjectURL.mockClear();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: objectUrlMocks.createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: objectUrlMocks.revokeObjectURL,
    });
  });

  afterEach(() => {
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
    }
    else {
      delete (URL as { createObjectURL?: unknown }).createObjectURL;
    }

    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    }
    else {
      delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
    }
  });

  it("图片消息列表预览使用 medium 档位，点开大图走 original", () => {
    const html = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.IMG,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 45 },
            width: 640,
            height: 480,
          },
        },
      },
    }));

    expect(html).toContain("https://media.tuan.chat/media/v1/files/045/45/image/medium.webp");
    expect(html).toContain("data-zoom-quality=\"original\"");
    expect(html).not.toContain("/image/low.webp");
  });

  it("音频和视频消息只使用 low 档位", () => {
    const videoHtml = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.VIDEO,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          videoMessage: {
            source: { kind: "internal", fileId: 34 },
          },
        },
      },
    }));
    const audioHtml = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.SOUND,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          soundMessage: {
            source: { kind: "internal", fileId: 12 },
          },
        },
      },
    }));

    expect(videoHtml).toContain("https://media.tuan.chat/media/v1/files/034/34/video/low.webm");
    expect(audioHtml).toContain("https://media.tuan.chat/media/v1/files/012/12/audio/low.webm");
    expect(`${videoHtml}${audioHtml}`).not.toMatch(/\/(medium|high)\.webm/);
  });

  it("文件消息只使用 low 档位", () => {
    const html = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.FILE,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          fileMessage: {
            fileId: 78,
            mediaType: "document",
            fileName: "rulebook.pdf",
            size: 2765,
          },
        },
      },
    }));

    expect(html).toContain("https://media.tuan.chat/media/v1/files/078/78/document/low");
    expect(html).toContain("<svg");
    expect(html).toContain("rulebook.pdf");
    expect(html).toContain("2.7 KiB");
    expect(html).toContain("group/file flex min-w-0 w-full");
    expect(html).toContain("flex min-w-0 w-full");
    expect(html).toContain("group-hover/file:underline");
    expect(html).toContain("decoration-dotted");
    expect(html).not.toContain("/original");
  });

  it("本地乐观图片有本地文件时直接渲染文件预览", () => {
    const localFile = new File(["image"], "scene.png", { type: "image/png" });
    const html = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.IMG,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: -1 },
            localFile,
            width: 1,
            height: 1,
          },
        },
      },
    }));

    expect(html).toContain("data-local-file=\"scene.png\"");
    expect(html).toContain("data-width=\"\"");
    expect(html).toContain("data-height=\"\"");
    expect(html).not.toContain("[图片]");
    expect(html).not.toContain("/media/v1/files/");
  });

  it("本地乐观媒体没有本地文件时不会为非正数 fileId 生成 CDN 地址", () => {
    const html = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.IMG,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: -1 },
            width: 1,
            height: 1,
          },
        },
      },
    }));

    expect(html).toContain("[图片]");
    expect(html).not.toContain("/media/v1/files/");
  });

  it("本地乐观音频和视频有本地文件时直接渲染文件预览", () => {
    const audioFile = new File(["audio"], "voice.mp3", { type: "audio/mpeg" });
    const videoFile = new File(["video"], "clip.webm", { type: "video/webm" });
    const audioHtml = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.SOUND,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          soundMessage: {
            source: { kind: "internal", fileId: -1 },
            localFile: audioFile,
            fileName: "voice.mp3",
            second: 1,
          },
        },
      },
    }));
    const videoHtml = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.VIDEO,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          videoMessage: {
            source: { kind: "internal", fileId: -1 },
            localFile: videoFile,
            fileName: "clip.webm",
          },
        },
      },
    }));

    expect(audioHtml).toContain("data-audio-url=\"blob:voice.mp3\"");
    expect(videoHtml).toContain("data-video-url=\"blob:clip.webm\"");
    expect(audioHtml).not.toContain("[语音]");
    expect(videoHtml).not.toContain("[视频资源不可用]");
    expect(`${audioHtml}${videoHtml}`).not.toContain("/media/v1/files/");
  });
});

