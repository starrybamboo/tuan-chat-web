import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { describe, expect, it } from "vitest";

import { parseRoomMessagePushPayload } from "./useWebSocketMessageHandlers";

function createRoomMessage(messageId: number): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      extra: {},
      messageId,
      messageType: 1,
      position: messageId,
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
    },
  };
}

describe("parseRoomMessagePushPayload", () => {
  it("保留现有单条 MESSAGE payload 兼容", () => {
    const message = createRoomMessage(1);

    expect(parseRoomMessagePushPayload(4, message)).toEqual([message]);
    expect(parseRoomMessagePushPayload(4, { message: null })).toEqual([]);
  });

  it("解析批量 MESSAGE_BATCH payload 并过滤无效项", () => {
    const first = createRoomMessage(1);
    const second = createRoomMessage(2);

    expect(parseRoomMessagePushPayload(25, [first, null, {}, second])).toEqual([first, second]);
    expect(parseRoomMessagePushPayload(25, first)).toEqual([]);
  });
});
