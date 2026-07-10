import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { getMaxRoomMessageSyncId } from "@tuanchat/query/room-message";

import type { RoomMessagesSyncResult } from "./roomMessagesQueryData";

import {
  mergeRoomMessagesForQueryCache,
  shouldResetCachedRoomMessages,
} from "./roomMessageCacheState";

type RoomMessagesQueryLoaderDeps = {
  clearCachedRoomMessages: (roomId: number) => Promise<void>;
  fetchRoomMessages: (roomId: number, maxKnownSyncId: number) => Promise<RoomMessagesSyncResult>;
  getCurrentMessages: () => ChatMessageResponse[];
  readCachedRoomMessages: (roomId: number) => Promise<ChatMessageResponse[]>;
  writeCachedRoomMessages: (roomId: number, messages: ChatMessageResponse[]) => Promise<void>;
};

/**
 * 加载房间历史时保留请求期间写入 Query 的乐观消息和实时消息。
 */
export async function loadRoomMessagesQueryData(
  roomId: number,
  deps: RoomMessagesQueryLoaderDeps,
): Promise<ChatMessageResponse[]> {
  const cachedMessages = await deps.readCachedRoomMessages(roomId);
  const currentMessagesBeforeFetch = deps.getCurrentMessages();
  const maxKnownSyncId = Math.max(
    getMaxRoomMessageSyncId(currentMessagesBeforeFetch),
    getMaxRoomMessageSyncId(cachedMessages),
  );
  const syncResult = await deps.fetchRoomMessages(roomId, maxKnownSyncId);

  // 历史请求期间可能已经发送了首条消息，必须在请求结束时重新读取热态。
  const latestCurrentMessages = deps.getCurrentMessages();
  if (shouldResetCachedRoomMessages(syncResult, true)) {
    void deps.clearCachedRoomMessages(roomId);
    return mergeRoomMessagesForQueryCache({
      cachedMessages: [],
      currentMessages: latestCurrentMessages,
      fetchedMessages: [],
      roomId,
    });
  }

  if (syncResult.messages.length > 0) {
    void deps.writeCachedRoomMessages(roomId, syncResult.messages);
  }

  return mergeRoomMessagesForQueryCache({
    cachedMessages,
    currentMessages: latestCurrentMessages,
    fetchedMessages: syncResult.messages,
    roomId,
  });
}
