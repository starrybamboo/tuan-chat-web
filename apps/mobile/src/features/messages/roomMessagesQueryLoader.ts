import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { getMaxRoomMessageSyncId } from "@tuanchat/query/room-message";

import type { RoomMessagesSyncResult } from "./roomMessagesQueryData";

import {
  mergeRoomMessagesForQueryCache,
  shouldResetCachedRoomMessages,
} from "./roomMessageCacheState";
import { traceRoomMessageTiming } from "./roomMessageTimingTrace";

type RoomMessagesQueryLoaderDeps = {
  clearCachedRoomMessages: (roomId: number) => Promise<void>;
  fetchRoomMessages: (roomId: number, maxKnownSyncId: number) => Promise<RoomMessagesSyncResult>;
  getCurrentMessages: () => ChatMessageResponse[];
  publishCachedMessages?: (messages: ChatMessageResponse[]) => void;
  readCachedRoomMessages: (roomId: number) => Promise<ChatMessageResponse[]>;
  signal?: AbortSignal;
  writeCachedRoomMessages: (roomId: number, messages: ChatMessageResponse[]) => Promise<void>;
};

/**
 * 加载房间历史时保留请求期间写入 Query 的乐观消息和实时消息。
 */
export async function loadRoomMessagesQueryData(
  roomId: number,
  deps: RoomMessagesQueryLoaderDeps,
): Promise<ChatMessageResponse[]> {
  const startedAt = Date.now();
  traceRoomMessageTiming("loader.start", { roomId });
  const cachedMessages = await deps.readCachedRoomMessages(roomId);
  traceRoomMessageTiming("loader.cache.ready", {
    count: cachedMessages.length,
    durationMs: Date.now() - startedAt,
    roomId,
  });
  // Query loader 是每次请求唯一的磁盘恢复入口，避免多个订阅者重复读取整房间历史。
  deps.publishCachedMessages?.(cachedMessages);
  if (deps.signal?.aborted) {
    const messages = mergeRoomMessagesForQueryCache({
      cachedMessages,
      currentMessages: deps.getCurrentMessages(),
      fetchedMessages: [],
      roomId,
    });
    traceRoomMessageTiming("loader.cancelled", {
      count: messages.length,
      durationMs: Date.now() - startedAt,
      phase: "before-history",
      roomId,
    });
    return messages;
  }
  const currentMessagesBeforeFetch = deps.getCurrentMessages();
  const maxKnownSyncId = Math.max(
    getMaxRoomMessageSyncId(currentMessagesBeforeFetch),
    getMaxRoomMessageSyncId(cachedMessages),
  );
  traceRoomMessageTiming("loader.history.start", {
    maxKnownSyncId,
    roomId,
  });
  let syncResult: RoomMessagesSyncResult;
  try {
    syncResult = await deps.fetchRoomMessages(roomId, maxKnownSyncId);
  }
  catch (error) {
    if (deps.signal?.aborted || isCancelledError(error)) {
      const messages = mergeRoomMessagesForQueryCache({
        cachedMessages,
        currentMessages: deps.getCurrentMessages(),
        fetchedMessages: [],
        roomId,
      });
      traceRoomMessageTiming("loader.cancelled", {
        count: messages.length,
        durationMs: Date.now() - startedAt,
        phase: "history",
        roomId,
      });
      return messages;
    }
    throw error;
  }
  traceRoomMessageTiming("loader.history.ready", {
    count: syncResult.messages.length,
    durationMs: Date.now() - startedAt,
    mode: syncResult.mode,
    roomId,
  });

  // 历史请求期间可能已经发送了首条消息，必须在请求结束时重新读取热态。
  const latestCurrentMessages = deps.getCurrentMessages();
  if (shouldResetCachedRoomMessages(syncResult, true)) {
    void deps.clearCachedRoomMessages(roomId);
    const messages = mergeRoomMessagesForQueryCache({
      cachedMessages: [],
      currentMessages: latestCurrentMessages,
      fetchedMessages: [],
      roomId,
    });
    traceRoomMessageTiming("loader.end", {
      count: messages.length,
      durationMs: Date.now() - startedAt,
      roomId,
    });
    return messages;
  }

  if (syncResult.messages.length > 0) {
    void deps.writeCachedRoomMessages(roomId, syncResult.messages);
  }

  const messages = mergeRoomMessagesForQueryCache({
    cachedMessages,
    currentMessages: latestCurrentMessages,
    fetchedMessages: syncResult.messages,
    roomId,
  });
  traceRoomMessageTiming("loader.end", {
    count: messages.length,
    durationMs: Date.now() - startedAt,
    roomId,
  });
  return messages;
}

function isCancelledError(error: unknown): boolean {
  return error instanceof Error && (
    error.name === "CancelError"
      || (error as { isCancelled?: unknown }).isCancelled === true
  );
}
