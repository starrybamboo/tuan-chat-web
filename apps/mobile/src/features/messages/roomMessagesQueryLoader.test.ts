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
  it("每次加载只读取一次磁盘，并在网络请求前发布缓存", async () => {
    const events: string[] = [];
    const cachedMessages = [createRoomMessage(1)];
    const readCachedRoomMessages = vi.fn(async () => {
      events.push("read");
      return cachedMessages;
    });
    const publishCachedMessages = vi.fn(() => {
      events.push("publish");
    });
    const fetchRoomMessages = vi.fn(async () => {
      events.push("fetch");
      return {
        messages: [],
        mode: "delta" as const,
      };
    });

    await loadRoomMessagesQueryData(9, {
      clearCachedRoomMessages: vi.fn().mockResolvedValue(undefined),
      fetchRoomMessages,
      getCurrentMessages: () => [],
      publishCachedMessages,
      readCachedRoomMessages,
      writeCachedRoomMessages: vi.fn().mockResolvedValue(undefined),
    });

    expect(readCachedRoomMessages).toHaveBeenCalledTimes(1);
    expect(publishCachedMessages).toHaveBeenCalledTimes(1);
    expect(publishCachedMessages).toHaveBeenCalledWith(cachedMessages);
    expect(events).toEqual(["read", "publish", "fetch"]);
  });

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

  it("取消发生在磁盘恢复后时跳过历史请求并保留当前热态", async () => {
    const signalController = new AbortController();
    const cachedMessage = createRoomMessage(1);
    const optimistic = createOptimisticRoomMessage({
      content: "first message",
      extra: {},
      messageType: 1,
      roomId: 9,
    }, {
      currentUserId: 7,
      optimisticId: -1,
      position: 2,
    });
    const fetchRoomMessages = vi.fn();
    const publishCachedMessages = vi.fn(() => {
      signalController.abort();
    });

    const result = await loadRoomMessagesQueryData(9, {
      clearCachedRoomMessages: vi.fn().mockResolvedValue(undefined),
      fetchRoomMessages,
      getCurrentMessages: () => [optimistic],
      publishCachedMessages,
      readCachedRoomMessages: vi.fn().mockResolvedValue([cachedMessage]),
      signal: signalController.signal,
      writeCachedRoomMessages: vi.fn().mockResolvedValue(undefined),
    });

    expect(fetchRoomMessages).not.toHaveBeenCalled();
    expect(result.map(item => item.message.messageId)).toEqual([1, -1]);
  });

  it("历史请求被取消时保留当前热态且不落盘取消结果", async () => {
    const optimistic = createOptimisticRoomMessage({
      content: "first message",
      extra: {},
      messageType: 1,
      roomId: 9,
    }, {
      currentUserId: 7,
      optimisticId: -1,
      position: 2,
    });
    const writeCachedRoomMessages = vi.fn().mockResolvedValue(undefined);
    const signalController = new AbortController();
    const fetchRoomMessages = vi.fn(async () => {
      signalController.abort();
      const error = new Error("Request aborted");
      error.name = "CancelError";
      throw error;
    });

    const result = await loadRoomMessagesQueryData(9, {
      clearCachedRoomMessages: vi.fn().mockResolvedValue(undefined),
      fetchRoomMessages,
      getCurrentMessages: () => [optimistic],
      readCachedRoomMessages: vi.fn().mockResolvedValue([createRoomMessage(1)]),
      signal: signalController.signal,
      writeCachedRoomMessages,
    });

    expect(fetchRoomMessages).toHaveBeenCalledWith(9, 1);
    expect(writeCachedRoomMessages).not.toHaveBeenCalled();
    expect(result.map(item => item.message.messageId)).toEqual([1, -1]);
  });
});
