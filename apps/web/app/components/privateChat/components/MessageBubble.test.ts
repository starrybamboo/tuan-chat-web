import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import MessageBubble from "./MessageBubble";

vi.mock("@/components/common/betterImg", () => ({
  default: ({ src, zoomQuality }: { src: string; zoomQuality?: string }) => createElement("img", {
    "data-src": src,
    "data-zoom-quality": zoomQuality ?? "",
  }),
}));

describe("private MessageBubble", () => {
  it("私聊图片消息列表走 medium，点开大图走 original", () => {
    const html = renderToStaticMarkup(createElement(MessageBubble, {
      groupedWithPrevious: true,
      isOwn: true,
      message: {
        messageId: 1,
        messageType: 2,
        content: "",
        createTime: "2026-05-30T12:00:00Z",
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 45 },
            width: 640,
            height: 480,
          },
        },
      } as never,
    }));

    expect(html).toContain("data-src=\"https://media.tuan.chat/media/v1/files/045/45/image/medium.webp\"");
    expect(html).toContain("data-zoom-quality=\"original\"");
  });
});
