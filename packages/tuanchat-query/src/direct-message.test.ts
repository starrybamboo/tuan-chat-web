import { describe, expect, it } from "vitest";

import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import {
  getDirectInboxQueryKey,
  markDirectMessageRecalledData,
  upsertDirectInboxMessagesData,
} from "./direct-message";

function createDirectMessage(messageId: number, syncId: number): MessageDirectResponse {
  return {
    content: `message-${messageId}`,
    createTime: `2026-05-17T00:00:0${syncId}.000Z`,
    messageId,
    messageType: 1,
    receiverId: 7,
    senderId: 42,
    status: 0,
    syncId,
    userId: 7,
  };
}

describe("direct message query helpers", () => {
  it("提供稳定 inbox query key", () => {
    expect(getDirectInboxQueryKey(7)).toEqual(["dmInbox", 7]);
    expect(getDirectInboxQueryKey(null)).toEqual(["dmInbox", null]);
  });

  it("upsert inbox 消息时按 messageId 去重", () => {
    expect(upsertDirectInboxMessagesData([
      createDirectMessage(1, 1),
      createDirectMessage(2, 2),
    ], [
      { ...createDirectMessage(2, 2), content: "updated" },
      createDirectMessage(3, 3),
    ])).toEqual([
      createDirectMessage(1, 1),
      { ...createDirectMessage(2, 2), content: "updated" },
      createDirectMessage(3, 3),
    ]);
  });

  it("撤回消息时会把命中的消息标记为已撤回", () => {
    expect(markDirectMessageRecalledData([
      createDirectMessage(1, 1),
      createDirectMessage(2, 2),
    ], 2)).toEqual([
      createDirectMessage(1, 1),
      { ...createDirectMessage(2, 2), status: 1 },
    ]);
  });
});
