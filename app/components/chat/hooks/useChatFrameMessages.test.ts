import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "../../../../api";

import { detectMissingMessageSyncRange } from "./useChatFrameMessages";

function message(messageId: number, syncId: number): ChatMessageResponse {
  return {
    message: {
      messageId,
      syncId,
      roomId: 10,
      userId: 20,
      roleId: 0,
      content: "",
      status: 0,
      messageType: 2,
      position: messageId,
      createTime: "2026-05-06T00:00:00.000Z",
      updateTime: "2026-05-06T00:00:00.000Z",
    },
  };
}

describe("detectMissingMessageSyncRange", () => {
  it("本地 latestSyncId 已覆盖删除等隐藏消息时不补拉 history", () => {
    expect(detectMissingMessageSyncRange({
      historyMessages: [message(1, 100)],
      previousReceivedMessages: [],
      appendedMessages: [message(2, 102)],
      latestHistorySyncId: 101,
    })).toBeNull();
  });

  it("收到真正跳号的新消息时返回缺失区间", () => {
    expect(detectMissingMessageSyncRange({
      historyMessages: [message(1, 100)],
      previousReceivedMessages: [],
      appendedMessages: [message(2, 103)],
      latestHistorySyncId: 100,
    })).toEqual({
      missingStartSyncId: 101,
      gapIncomingSyncId: 103,
    });
  });

  it("收到已知 messageId 的更新时不按较大 syncId 误补洞", () => {
    expect(detectMissingMessageSyncRange({
      historyMessages: [message(1, 100)],
      previousReceivedMessages: [],
      appendedMessages: [message(1, 103)],
      latestHistorySyncId: 100,
    })).toBeNull();
  });
});
