import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { DIRECT_MESSAGE_READ_LINE_TYPE } from "@tuanchat/domain/direct-message";
import { describe, expect, it } from "vitest";

import { hasPersistableDirectInboxMessages } from "./dmInboxCacheState";
import { shouldEnableDmInboxQuery } from "./dmInboxQueryOptions";

function createDirectMessage(messageId: number, overrides: Partial<MessageDirectResponse> = {}): MessageDirectResponse {
  return {
    content: `message-${messageId}`,
    createTime: "2026-05-21T00:00:00.000Z",
    messageId,
    messageType: 1,
    receiverId: 7,
    senderId: 42,
    status: 0,
    syncId: messageId,
    userId: 7,
    ...overrides,
  };
}

describe("useDmInboxQuery helpers", () => {
  it("允许房间首屏按需关闭私聊 inbox 请求", () => {
    expect(shouldEnableDmInboxQuery(10001, { enabled: false })).toBe(false);
    expect(shouldEnableDmInboxQuery(10001, { enabled: true })).toBe(true);
    expect(shouldEnableDmInboxQuery(null, { enabled: true })).toBe(false);
  });

  it("只有已读线时不应把旧私聊缓存继续保留下来", () => {
    expect(hasPersistableDirectInboxMessages([])).toBe(false);
    expect(hasPersistableDirectInboxMessages([
      createDirectMessage(-42, { messageType: DIRECT_MESSAGE_READ_LINE_TYPE }),
    ])).toBe(false);
  });

  it("存在真实私聊消息时仍然保留并写回缓存", () => {
    expect(hasPersistableDirectInboxMessages([
      createDirectMessage(1),
      createDirectMessage(-42, { messageType: DIRECT_MESSAGE_READ_LINE_TYPE }),
    ])).toBe(true);
  });

  it("只有本地待确认消息时也不会清空 pending 表", () => {
    expect(hasPersistableDirectInboxMessages([
      createDirectMessage(-1, { tcLocalSyncState: "optimistic" } as Partial<MessageDirectResponse>),
    ])).toBe(true);
    expect(hasPersistableDirectInboxMessages([
      createDirectMessage(-2, { tcLocalSyncState: "failed" } as Partial<MessageDirectResponse>),
    ])).toBe(true);
  });
});
