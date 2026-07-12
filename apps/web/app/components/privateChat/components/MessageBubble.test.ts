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
  it("私聊消息时间使用统一格式并保持单行显示", () => {
    const html = renderToStaticMarkup(createElement(MessageBubble, {
      groupedWithPrevious: true,
      isOwn: true,
      message: {
        messageId: 0,
        messageType: 1,
        content: "测试时间",
        createTime: "2026-05-30T12:00:00Z",
      } as never,
    }));

    expect(html).toContain("whitespace-nowrap");
    expect(html).not.toContain("2026/5/30 20:00:00");
  });

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

  it("私聊撤回消息显示撤回态且不渲染原内容", () => {
    const html = renderToStaticMarkup(createElement(MessageBubble, {
      groupedWithPrevious: true,
      isOwn: true,
      message: {
        messageId: 2,
        messageType: 1,
        content: "不能继续展示的原消息",
        createTime: "2026-05-30T12:00:00Z",
        status: 1,
      } as never,
    }));

    expect(html).toContain("此消息已被撤回");
    expect(html).not.toContain("不能继续展示的原消息");
  });

  it("私聊回复消息会渲染被回复消息预览", () => {
    const html = renderToStaticMarkup(createElement(MessageBubble, {
      groupedWithPrevious: true,
      isOwn: true,
      message: {
        messageId: 3,
        messageType: 1,
        content: "这是回复",
        createTime: "2026-05-30T12:00:00Z",
        replyMessageId: 2,
        status: 0,
      } as never,
      replyMessage: {
        messageId: 2,
        messageType: 1,
        content: "被回复内容",
        senderUsername: "Alice",
        status: 0,
      } as never,
    }));

    expect(html).toContain("回复 Alice");
    expect(html).toContain("被回复内容");
    expect(html).toContain("这是回复");
  });

  it("自己发送的媒体回复消息使用中性引用样式，避免白字浮在透明背景上", () => {
    const html = renderToStaticMarkup(createElement(MessageBubble, {
      groupedWithPrevious: true,
      isOwn: true,
      message: {
        messageId: 4,
        messageType: 2,
        content: "",
        createTime: "2026-05-30T12:00:00Z",
        replyMessageId: 2,
        status: 0,
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 46 },
            width: 640,
            height: 480,
          },
        },
      } as never,
      replyMessage: {
        messageId: 2,
        messageType: 1,
        content: "被回复内容",
        senderUsername: "Alice",
        status: 0,
      } as never,
    }));

    expect(html).toContain("border-base-content/25 bg-base-100/60 text-base-content/65");
    expect(html).not.toContain("border-white/60 bg-white/15 text-white/80");
  });
});
