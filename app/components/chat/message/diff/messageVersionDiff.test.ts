import { describe, expect, it } from "vitest";

import {
  buildBaseArchiveMessageIndex,
  getBaseMessageForVersionDiff,
  VERSION_STATE_MODIFIED,
} from "@/components/chat/message/diff/messageVersionDiff";

import type { ChatMessageResponse } from "../../../../../api";

function messageResponse(message: Partial<ChatMessageResponse["message"]>): ChatMessageResponse {
  return {
    message: {
      messageId: 1,
      syncId: 1,
      roomId: 1,
      userId: 1,
      content: "",
      status: 0,
      messageType: 0,
      position: 1,
      ...message,
    },
  };
}

describe("messageVersionDiff", () => {
  it("用归档快照里的 inheritedArchiveMessageId 建立稳定索引", () => {
    const base = messageResponse({
      messageId: 100,
      inheritedArchiveMessageId: 9001,
      content: "归档文本",
    });

    const index = buildBaseArchiveMessageIndex([base]);

    expect(index.get(9001)).toBe(base);
  });

  it("可以为修改态消息找到继承来源并返回 base 消息", () => {
    const base = messageResponse({
      messageId: 100,
      inheritedArchiveMessageId: 9001,
      content: "归档文本",
    });
    const current = messageResponse({
      messageId: 200,
      inheritedArchiveMessageId: 9001,
      versionState: VERSION_STATE_MODIFIED,
      content: "当前文本",
    });

    const result = getBaseMessageForVersionDiff(current, buildBaseArchiveMessageIndex([base]));

    expect(result).toBe(base);
  });

  it("内容没有变化时不展示版本 diff", () => {
    const base = messageResponse({
      messageId: 100,
      inheritedArchiveMessageId: 9001,
      content: "同一文本",
    });
    const current = messageResponse({
      messageId: 200,
      inheritedArchiveMessageId: 9001,
      versionState: VERSION_STATE_MODIFIED,
      content: "同一文本",
    });

    const result = getBaseMessageForVersionDiff(current, buildBaseArchiveMessageIndex([base]));

    expect(result).toBeNull();
  });

  it("非修改态消息不展示版本 diff", () => {
    const base = messageResponse({
      inheritedArchiveMessageId: 9001,
      content: "归档文本",
    });
    const current = messageResponse({
      inheritedArchiveMessageId: 9001,
      versionState: 0,
      content: "当前文本",
    });

    const result = getBaseMessageForVersionDiff(current, buildBaseArchiveMessageIndex([base]));

    expect(result).toBeNull();
  });
});
