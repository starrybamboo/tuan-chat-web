import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "../../../../api";

import {
  compareChatMessageResponsesByOrder,
  getNextAppendPosition,
} from "./messageOrder";

function buildMessage(partial: Partial<ChatMessageResponse["message"]>): ChatMessageResponse {
  return {
    message: {
      messageId: 0,
      syncId: 0,
      position: 0,
      roomId: 1,
      userId: 1,
      status: 0,
      messageType: 1,
      content: "",
      ...partial,
    } as ChatMessageResponse["message"],
  };
}

describe("messageOrder", () => {
  it("优先按 position 升序排序", () => {
    const messages = [
      buildMessage({ messageId: 3, syncId: 3, position: 30 }),
      buildMessage({ messageId: 1, syncId: 1, position: 10 }),
      buildMessage({ messageId: 2, syncId: 2, position: 20 }),
    ];

    const sorted = [...messages].sort(compareChatMessageResponsesByOrder);

    expect(sorted.map(item => item.message.messageId)).toEqual([1, 2, 3]);
  });

  it("position 相同或缺失时按 syncId 兜底", () => {
    const messages = [
      buildMessage({ messageId: 20, syncId: 20, position: Number.NaN }),
      buildMessage({ messageId: 10, syncId: 10, position: Number.NaN }),
    ];

    const sorted = [...messages].sort(compareChatMessageResponsesByOrder);

    expect(sorted.map(item => item.message.messageId)).toEqual([10, 20]);
  });

  it("position 和 syncId 相同或缺失时按 messageId 兜底", () => {
    const messages = [
      buildMessage({ messageId: 9, syncId: Number.NaN, position: Number.NaN }),
      buildMessage({ messageId: 7, syncId: Number.NaN, position: Number.NaN }),
    ];

    const sorted = [...messages].sort(compareChatMessageResponsesByOrder);

    expect(sorted.map(item => item.message.messageId)).toEqual([7, 9]);
  });

  it("空列表追加时下一个 position 从 1 开始", () => {
    expect(getNextAppendPosition([])).toBe(1);
  });

  it("追加消息 position 为当前最大值 + 1", () => {
    const messages = [
      buildMessage({ messageId: 1, position: 1 }),
      buildMessage({ messageId: 2, position: 5.5 }),
      buildMessage({ messageId: 3, position: 5.75 }),
    ];

    expect(getNextAppendPosition(messages)).toBe(6.75);
  });
});
