import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import MessageContentRenderer from "./messageContentRenderer";

vi.mock("@/components/common/betterImg", () => ({
  default: ({ src }: { src: string }) => createElement("img", { src }),
}));

vi.mock("@/components/chat/message/media/CachedVideoMessage", () => ({
  default: ({ url }: { url: string }) => createElement("video", { "data-url": url }),
}));

vi.mock("@/components/chat/message/media/AudioMessage", () => ({
  default: ({ url }: { url: string }) => createElement("div", { "data-audio-url": url }),
}));

describe("messageContentRenderer 聊天室媒体质量", () => {
  it("图片消息列表预览使用 low 档位", () => {
    const html = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.IMG,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          imageMessage: {
            fileId: 45,
            mediaType: "image",
            width: 640,
            height: 480,
          },
        },
      },
    }));

    expect(html).toContain("https://tuan.chat/media/v1/files/045/45/image/low.webp");
    expect(html).not.toContain("/image/medium.webp");
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
            fileId: 34,
            mediaType: "video",
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
            fileId: 12,
            mediaType: "audio",
          },
        },
      },
    }));

    expect(videoHtml).toContain("https://tuan.chat/media/v1/files/034/34/video/low.webm");
    expect(audioHtml).toContain("https://tuan.chat/media/v1/files/012/12/audio/low.webm");
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

    expect(html).toContain("https://tuan.chat/media/v1/files/078/78/document/low");
    expect(html).toContain("<svg");
    expect(html).toContain("rulebook.pdf");
    expect(html).toContain("2.7 KiB");
    expect(html).toContain("group/file flex min-w-0 w-full");
    expect(html).toContain("flex min-w-0 w-full");
    expect(html).toContain("group-hover/file:underline");
    expect(html).toContain("decoration-dotted");
    expect(html).not.toContain("/original");
  });

  it("本地乐观媒体占位不会为非正数 fileId 生成 CDN 地址", () => {
    const html = renderToStaticMarkup(createElement(MessageContentRenderer, {
      message: {
        messageType: MESSAGE_TYPE.IMG,
        content: "",
        roleId: 1,
        avatarId: 1,
        extra: {
          imageMessage: {
            fileId: -1,
            mediaType: "image",
            width: 1,
            height: 1,
          },
        },
      },
    }));

    expect(html).toContain("[图片]");
    expect(html).not.toContain("/media/v1/files/");
  });
});
