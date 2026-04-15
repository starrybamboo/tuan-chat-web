import { describe, expect, it } from "vitest";

import type { Message } from "../../../../../api";

import { MessageType } from "../../../../../api/wsModels";
import { buildPreviewRenderState } from "./previewMessage";

function createMessage(partial?: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 1,
    userId: 2,
    roleId: 3,
    content: ".rc 射击",
    status: 0,
    messageType: MessageType.DICE,
    position: 1,
    extra: {
      diceResult: {
        result: ".rc 射击",
      },
    } as any,
    createTime: "2026-04-14 21:10:00",
    updateTime: "2026-04-14 21:10:00",
    ...partial,
  } as Message;
}

describe("buildPreviewRenderState", () => {
  it("引用目标暂时未解析到时显示加载态，不误报消息不可见", () => {
    expect(buildPreviewRenderState({
      messageBody: undefined,
      fallbackPreviewMessage: undefined,
      canViewMessage: false,
    })).toEqual({
      previewText: "加载中...",
      isPlainTextOnly: true,
    });
  });

  it("引用目标短暂丢失时沿用上一次已解析到的预览", () => {
    const fallbackPreviewMessage = createMessage();

    expect(buildPreviewRenderState({
      messageBody: undefined,
      fallbackPreviewMessage,
      canViewMessage: false,
    })).toEqual({
      previewMessage: fallbackPreviewMessage,
      previewText: "[骰娘] .rc 射击",
      isPlainTextOnly: false,
    });
  });

  it("只有真正不可见时才显示消息不可见", () => {
    expect(buildPreviewRenderState({
      messageBody: createMessage(),
      fallbackPreviewMessage: undefined,
      canViewMessage: false,
    })).toEqual({
      previewText: "[消息不可见]",
      isPlainTextOnly: true,
    });
  });
});
