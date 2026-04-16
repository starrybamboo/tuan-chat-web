import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import {
  buildStoredRoomMessageCache,
  MOBILE_ROOM_MESSAGE_CACHE_LIMIT,
  sanitizeStoredRoomMessageCache,
} from "./mobileRoomMessageCacheUtils";

function createChatMessageResponse(
  messageId: number,
  position: number,
  overrides: Partial<ChatMessageResponse["message"]> = {},
): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      messageId,
      messageType: 1,
      position,
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
      ...overrides,
    },
  };
}

describe("mobileRoomMessageCacheUtils", () => {
  it("写缓存前会去重、排序并只保留最近一段消息", () => {
    const messages = Array.from({ length: MOBILE_ROOM_MESSAGE_CACHE_LIMIT + 5 }, (_, index) => {
      const messageId = index + 1;
      return createChatMessageResponse(messageId, messageId);
    });

    const cache = buildStoredRoomMessageCache(9, [
      ...messages,
      createChatMessageResponse(85, 85, {
        content: "来自最新同步的覆盖版",
      }),
    ]);

    expect(cache).not.toBeNull();
    expect(cache?.messages).toHaveLength(MOBILE_ROOM_MESSAGE_CACHE_LIMIT);
    expect(cache?.messages[0]?.message.messageId).toBe(6);
    expect(cache?.messages.at(-1)?.message.content).toBe("来自最新同步的覆盖版");
  });

  it("读缓存时会丢弃非法 roomId，并容忍脏消息数组", () => {
    expect(sanitizeStoredRoomMessageCache(null)).toBeNull();
    expect(sanitizeStoredRoomMessageCache({
      roomId: "9",
      updatedAt: "2026-04-16T00:00:00.000Z",
    })).toBeNull();

    expect(sanitizeStoredRoomMessageCache({
      messages: ["not-a-message"],
      roomId: 9,
    })).toEqual({
      messages: [],
      roomId: 9,
      updatedAt: "1970-01-01T00:00:00.000Z",
    });
  });
});
