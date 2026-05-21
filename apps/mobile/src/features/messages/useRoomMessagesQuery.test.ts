import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { shouldResetCachedRoomMessages } from "./roomMessageCacheState";

function createRoomMessage(messageId: number): ChatMessageResponse {
  return {
    message: {
      avatarId: 1,
      content: `message-${messageId}`,
      createTime: "2026-05-21T00:00:00.000Z",
      messageId,
      messageType: 1,
      position: messageId,
      roomId: 7,
      status: 0,
      syncId: messageId,
      updateTime: "2026-05-21T00:00:00.000Z",
      userId: 42,
    },
  };
}

describe("useRoomMessagesQuery helpers", () => {
  it("网络成功且没有任何消息时会清空旧缓存", () => {
    expect(shouldResetCachedRoomMessages([], true)).toBe(true);
  });

  it("网络未成功或仍有消息时不会清空缓存", () => {
    expect(shouldResetCachedRoomMessages([], false)).toBe(false);
    expect(shouldResetCachedRoomMessages([createRoomMessage(-1)], true)).toBe(false);
    expect(shouldResetCachedRoomMessages([createRoomMessage(1)], true)).toBe(false);
  });
});
