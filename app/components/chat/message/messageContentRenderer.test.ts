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
});
