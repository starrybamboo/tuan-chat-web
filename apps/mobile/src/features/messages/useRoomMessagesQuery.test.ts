import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { shouldResetCachedRoomMessages } from "./roomMessageCacheState";
import type { RoomMessagesSyncResult } from "./roomMessageSync";

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
  it("仅当全量请求成功且没有任何消息时会清空旧缓存", () => {
    const result: RoomMessagesSyncResult = {
      messages: [],
      mode: "full",
    };
    expect(shouldResetCachedRoomMessages(result, true)).toBe(true);
  });

  it("增量请求为空时不会清空缓存", () => {
    const result: RoomMessagesSyncResult = {
      messages: [],
      mode: "delta",
    };
    expect(shouldResetCachedRoomMessages(result, true)).toBe(false);
  });

  it("网络未成功或仍有消息时不会清空缓存", () => {
    const emptyFullResult: RoomMessagesSyncResult = {
      messages: [],
      mode: "full",
    };
    const nonEmptyResult: RoomMessagesSyncResult = {
      messages: [createRoomMessage(-1)],
      mode: "full",
    };

    expect(shouldResetCachedRoomMessages(emptyFullResult, false)).toBe(false);
    expect(shouldResetCachedRoomMessages(nonEmptyResult, true)).toBe(false);
  });
});
