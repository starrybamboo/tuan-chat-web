import { describe, expect, it } from "vitest";

import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";

import {
  createMobileOptimisticDirectMessage,
  filterPersistableDirectMessages,
  isMobileOptimisticDirectMessage,
  removeMobileOptimisticDirectMessageData,
  replaceMobileOptimisticDirectMessageData,
} from "./mobileDirectMessageOptimistic";

function createRequest(overrides: Partial<MessageDirectSendRequest> = {}): MessageDirectSendRequest {
  return {
    content: "hello",
    extra: {},
    messageType: 1,
    receiverId: 42,
    ...overrides,
  };
}

function createServerMessage(overrides: Partial<MessageDirectResponse> = {}): MessageDirectResponse {
  return {
    content: "hello",
    createTime: "2026-05-28T12:00:01.000Z",
    extra: {},
    messageId: 100,
    messageType: 1,
    receiverId: 42,
    senderId: 7,
    status: 0,
    syncId: 100,
    userId: 7,
    ...overrides,
  };
}

describe("mobileDirectMessageOptimistic", () => {
  it("会从发送请求创建可识别的本地临时私聊消息", () => {
    const optimistic = createMobileOptimisticDirectMessage({
      currentUserId: 7,
      now: new Date("2026-05-28T12:00:00.000Z"),
      optimisticMessageId: -1,
      optimisticSyncId: 9001,
      request: createRequest({ replyMessageId: 88 }),
    });

    expect(optimistic).toMatchObject({
      content: "hello",
      createTime: "2026-05-28T12:00:00.000Z",
      messageId: -1,
      receiverId: 42,
      replyMessageId: 88,
      senderId: 7,
      syncId: 9001,
      userId: 7,
    });
    expect(optimistic && isMobileOptimisticDirectMessage(optimistic)).toBe(true);
  });

  it("服务端消息返回后会替换临时消息，失败时可移除临时消息", () => {
    const optimistic = createMobileOptimisticDirectMessage({
      currentUserId: 7,
      optimisticMessageId: -1,
      optimisticSyncId: 9001,
      request: createRequest(),
    });
    const committed = createServerMessage({ messageId: 100, syncId: 100 });

    expect(replaceMobileOptimisticDirectMessageData([optimistic!], -1, committed)).toEqual([committed]);
    expect(removeMobileOptimisticDirectMessageData([optimistic!, committed], -1)).toEqual([committed]);
  });

  it("持久化前会过滤本地临时私聊消息", () => {
    const optimistic = createMobileOptimisticDirectMessage({
      currentUserId: 7,
      optimisticMessageId: -1,
      optimisticSyncId: 9001,
      request: createRequest(),
    });
    const committed = createServerMessage();

    expect(filterPersistableDirectMessages([optimistic!, committed])).toEqual([committed]);
  });
});
