import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { describe, expect, it } from "vitest";

import type { DirectMessageEvent } from "api/wsModels";

import {
  getDirectMessagesForConversation,
  mergeConversationMessages,
} from "./usePrivateMessageRecever";

function createDirectMessage(overrides: Partial<DirectMessageEvent>): DirectMessageEvent {
  return {
    content: "hello",
    createTime: "2026-05-20T00:00:00.000Z",
    messageId: 1,
    messageType: 1,
    receiverId: 7,
    senderId: 42,
    status: 0,
    syncId: 1,
    userId: 7,
    ...overrides,
  };
}

describe("usePrivateMessageReceiver helpers", () => {
  it("会从当前联系人通道里保留自己刚发出的乐观消息", () => {
    const messagesByContact = {
      42: [
        createDirectMessage({
          content: "outgoing optimistic",
          messageId: 1001,
          receiverId: 42,
          senderId: 7,
          syncId: 1001,
          userId: 7,
        }),
        createDirectMessage({
          content: "incoming",
          messageId: 1002,
          receiverId: 7,
          senderId: 42,
          syncId: 1002,
          userId: 7,
        }),
      ],
    };

    expect(getDirectMessagesForConversation(messagesByContact, 7, 42).map(message => message.content)).toEqual([
      "outgoing optimistic",
      "incoming",
    ]);
  });

  it("兼容旧版按当前用户 key 暂存的 outgoing 消息并按 messageId 去重", () => {
    const optimistic = createDirectMessage({
      content: "legacy outgoing",
      messageId: 1001,
      receiverId: 42,
      senderId: 7,
      syncId: 1001,
      userId: 7,
    });
    const messagesByContact = {
      7: [optimistic],
      42: [optimistic],
    };

    expect(getDirectMessagesForConversation(messagesByContact, 7, 42)).toHaveLength(1);
    expect(getDirectMessagesForConversation(messagesByContact, 7, 42)[0].content).toBe("legacy outgoing");
  });

  it("合并历史与实时消息时过滤已读线并优先使用实时消息", () => {
    const historyMessage: MessageDirectResponse = createDirectMessage({
      content: "old",
      messageId: 10,
      syncId: 10,
    }) as MessageDirectResponse;
    const realtimeMessage = createDirectMessage({
      content: "new",
      messageId: 10,
      syncId: 10,
    });
    const readLine = createDirectMessage({
      messageId: 11,
      messageType: 10000,
      syncId: 11,
    });

    expect(mergeConversationMessages([historyMessage], [realtimeMessage, readLine])).toEqual([realtimeMessage]);
  });
});
