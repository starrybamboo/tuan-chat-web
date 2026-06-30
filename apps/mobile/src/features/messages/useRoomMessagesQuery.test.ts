import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { describe, expect, it } from "vitest";

import type { RoomMessagesSyncResult } from "./roomMessageSync";

import {
  mergeRoomMessagesForQueryCache,
  shouldHydrateRoomMessagesFromDisk,
  shouldResetCachedRoomMessages,
} from "./roomMessageCacheState";

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

  it("query cache 会合并磁盘快照、当前 Query 和网络增量", () => {
    const cached = createRoomMessage(1);
    const current = createRoomMessage(2);
    const fetched = createRoomMessage(3);

    const merged = mergeRoomMessagesForQueryCache({
      cachedMessages: [cached],
      currentMessages: [current],
      fetchedMessages: [fetched],
      roomId: 7,
    });

    expect(merged.map(item => item.message.messageId)).toEqual([1, 2, 3]);
  });

  it("query cache 合并时忽略其他房间和未落库乐观消息", () => {
    const existing = createRoomMessage(1);
    const otherRoom = createRoomMessage(2);
    otherRoom.message.roomId = 8;
    const optimistic = createRoomMessage(-1);
    optimistic.message.syncId = -1;

    const merged = mergeRoomMessagesForQueryCache({
      cachedMessages: [otherRoom, optimistic],
      currentMessages: [existing],
      fetchedMessages: [otherRoom, optimistic],
      roomId: 7,
    });

    expect(merged).toBeInstanceOf(Array);
    expect(merged.map(item => item.message.messageId)).toEqual([1]);
  });

  it("query 成功时不再从磁盘回灌旧缓存", () => {
    expect(shouldHydrateRoomMessagesFromDisk("success", [createRoomMessage(1)])).toBe(false);
    expect(shouldHydrateRoomMessagesFromDisk("pending", [createRoomMessage(1)])).toBe(true);
    expect(shouldHydrateRoomMessagesFromDisk("error", [])).toBe(false);
  });
});
