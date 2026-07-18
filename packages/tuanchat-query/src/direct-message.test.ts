import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { describe, expect, it } from "vitest";

import {
  getDirectBadgeSummaryQueryKey,
  getDirectInboxQueryKey,
  markDirectMessageRecalledData,
  mergeDirectInboxServerSnapshot,
  removeDirectInboxMessageData,
  replaceDirectOptimisticInboxMessageData,
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

  it("按当前用户隔离轻量角标摘要缓存", () => {
    expect(getDirectBadgeSummaryQueryKey(7)).toEqual(["directBadgeSummary", 7]);
    expect(getDirectBadgeSummaryQueryKey(null)).toEqual(["directBadgeSummary", null]);
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

  it("移除 inbox 消息时只删除指定 messageId", () => {
    expect(removeDirectInboxMessageData([
      createDirectMessage(1, 1),
      createDirectMessage(2, 2),
    ], 1)).toEqual([
      createDirectMessage(2, 2),
    ]);
  });

  it("服务端私聊消息提交时会替换对应乐观消息", () => {
    const optimistic = createDirectMessage(-1, -1);
    const committed = { ...createDirectMessage(10, 3), content: "committed" };

    expect(replaceDirectOptimisticInboxMessageData([
      createDirectMessage(1, 1),
      optimistic,
    ], -1, committed)).toEqual([
      createDirectMessage(1, 1),
      committed,
    ]);
  });

  it("服务端快照替换 confirmed projection，但保留本地 pending overlay", () => {
    const staleConfirmed = { ...createDirectMessage(1, 1), content: "stale" };
    const serverConfirmed = { ...createDirectMessage(1, 1), content: "server" };
    const failed = {
      ...createDirectMessage(-1, 10),
      content: "failed",
      tcLocalSyncState: "failed",
    } as MessageDirectResponse;
    const optimistic = {
      ...createDirectMessage(-2, 11),
      content: "optimistic",
      tcLocalSyncState: "optimistic",
    } as MessageDirectResponse;

    const merged = mergeDirectInboxServerSnapshot(
      [staleConfirmed, failed, optimistic],
      [serverConfirmed],
    );

    expect(merged).toHaveLength(3);
    expect(merged.find(message => message.messageId === 1)?.content).toBe("server");
    expect(merged.find(message => message.messageId === -1)).toMatchObject({
      content: "failed",
      tcLocalSyncState: "failed",
    });
    expect(merged.find(message => message.messageId === -2)).toMatchObject({
      content: "optimistic",
      tcLocalSyncState: "optimistic",
    });
  });
});
