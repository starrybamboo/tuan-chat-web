import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { createOptimisticRoomMessage } from "@tuanchat/query/room-message-lifecycle";
import { describe, expect, it, vi } from "vitest";

import type { RoomMessagesSyncResult } from "./roomMessagesQueryData";

import { loadRoomMessagesQueryData } from "./roomMessagesQueryLoader";

function createRoomMessage(messageId: number, syncId = messageId): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      extra: {},
      messageId,
      messageType: 1,
      position: messageId,
      roomId: 9,
      status: 0,
      syncId,
      userId: 7,
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe("roomMessagesQueryLoader", () => {
  it("历史请求期间发送首条消息时保留乐观消息", async () => {
    const historyResult = createDeferred<RoomMessagesSyncResult>();
    const fetchStarted = createDeferred<void>();
    let currentMessages: ChatMessageResponse[] = [];
    const fetchRoomMessages = vi.fn(async () => {
      fetchStarted.resolve();
      return historyResult.promise;
    });

    const loading = loadRoomMessagesQueryData(9, {
      clearCachedRoomMessages: vi.fn().mockResolvedValue(undefined),
      fetchRoomMessages,
      getCurrentMessages: () => currentMessages,
      readCachedRoomMessages: vi.fn().mockResolvedValue([createRoomMessage(1)]),
      writeCachedRoomMessages: vi.fn().mockResolvedValue(undefined),
    });

    await fetchStarted.promise;
    currentMessages = [createOptimisticRoomMessage({
      content: "first message",
      extra: {},
      messageType: 1,
      roomId: 9,
    }, {
      currentUserId: 7,
      optimisticId: -1,
      position: 2,
    })];
    historyResult.resolve({
      messages: [createRoomMessage(1)],
      mode: "delta",
    });

    const result = await loading;

    expect(fetchRoomMessages).toHaveBeenCalledWith(9, 1);
    expect(result.map(item => item.message.messageId)).toEqual([1, -1]);
    expect(result[1]?.message.content).toBe("first message");
  });

  it("空历史结果清理磁盘快照时仍保留请求期间的乐观消息", async () => {
    const optimistic = createOptimisticRoomMessage({
      content: "first message",
      extra: {},
      messageType: 1,
      roomId: 9,
    }, {
      currentUserId: 7,
      optimisticId: -1,
      position: 1,
    });
    const clearCachedRoomMessages = vi.fn().mockResolvedValue(undefined);

    const result = await loadRoomMessagesQueryData(9, {
      clearCachedRoomMessages,
      fetchRoomMessages: vi.fn().mockResolvedValue({
        messages: [],
        mode: "full",
      }),
      getCurrentMessages: () => [optimistic],
      readCachedRoomMessages: vi.fn().mockResolvedValue([]),
      writeCachedRoomMessages: vi.fn().mockResolvedValue(undefined),
    });

    expect(clearCachedRoomMessages).toHaveBeenCalledWith(9);
    expect(result).toEqual([optimistic]);
  });
});
