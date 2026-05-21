import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { getAllRoomMessagesQueryKey } from "@tuanchat/query/chat";
import {
  getRoomMessageSyncGapStart,
} from "@tuanchat/query/room-message";
import { reconcileOptimisticRoomMessagesInList } from "@tuanchat/query/room-message-lifecycle";

type RoomMessageSyncClient = {
  chatController: {
    getAllMessage: (roomId: number) => Promise<unknown>;
    getHistoryMessages: (request: { roomId: number; syncId: number }) => Promise<unknown>;
  };
};

export type FetchRoomMessagesWithLocalSyncDeps = {
  client: RoomMessageSyncClient;
  getMaxCachedSyncId: (roomId: number) => Promise<number>;
};

export type RoomMessagesFetchMode = "full" | "delta";

export type RoomMessagesSyncResult = {
  messages: ChatMessageResponse[];
  mode: RoomMessagesFetchMode;
};

type RoomMessageQueryCache = {
  getQueryData: (queryKey: readonly unknown[]) => ChatMessageResponse[] | undefined;
  setQueryData: (
    queryKey: readonly unknown[],
    updater: (currentData: ChatMessageResponse[] | undefined) => ChatMessageResponse[],
  ) => void;
};

export type UpsertRoomMessagesToQueryAndDiskDeps = {
  fetchHistoryMessages: (roomId: number, syncId: number) => Promise<ChatMessageResponse[]>;
  queryClient: RoomMessageQueryCache;
  writeCachedRoomMessages: (roomId: number, messages: ChatMessageResponse[]) => Promise<void>;
};

export function extractChatMessageResponses(result: unknown): ChatMessageResponse[] {
  const data = (result as { data?: unknown } | null)?.data ?? result;
  return Array.isArray(data) ? data as ChatMessageResponse[] : [];
}

export async function fetchRoomMessagesWithLocalSync(
  roomId: number,
  deps: FetchRoomMessagesWithLocalSyncDeps,
): Promise<RoomMessagesSyncResult> {
  const maxCachedSyncId = await deps.getMaxCachedSyncId(roomId);
  if (maxCachedSyncId >= 0) {
    const result = await deps.client.chatController.getHistoryMessages({
      roomId,
      syncId: maxCachedSyncId + 1,
    });
    return {
      messages: extractChatMessageResponses(result),
      mode: "delta",
    };
  }

  const result = await deps.client.chatController.getAllMessage(roomId);
  return {
    messages: extractChatMessageResponses(result),
    mode: "full",
  };
}

function persistRoomMessages(
  roomId: number,
  messages: ChatMessageResponse[],
  writeCachedRoomMessages: (roomId: number, messages: ChatMessageResponse[]) => Promise<void>,
) {
  if (messages.length === 0) {
    return;
  }

  void writeCachedRoomMessages(roomId, messages).catch((error) => {
    console.warn("[roomMessageSync] 写入房间消息磁盘缓存失败:", error);
  });
}

export function upsertRoomMessagesToQueryAndDisk(
  roomId: number,
  incomingMessages: ChatMessageResponse[],
  deps: UpsertRoomMessagesToQueryAndDiskDeps,
) {
  if (!Number.isInteger(roomId) || roomId <= 0 || incomingMessages.length === 0) {
    return;
  }

  const queryKey = getAllRoomMessagesQueryKey(roomId);
  deps.queryClient.setQueryData(
    queryKey,
    currentData => reconcileOptimisticRoomMessagesInList(currentData, incomingMessages),
  );
  persistRoomMessages(roomId, incomingMessages, deps.writeCachedRoomMessages);
}

export function upsertLiveRoomMessageWithGapRepair(
  roomId: number,
  message: ChatMessageResponse,
  deps: UpsertRoomMessagesToQueryAndDiskDeps,
) {
  const queryKey = getAllRoomMessagesQueryKey(roomId);
  const currentMessages = deps.queryClient.getQueryData(queryKey);
  const gapStartSyncId = getRoomMessageSyncGapStart(currentMessages, message);

  if (gapStartSyncId != null) {
    void deps.fetchHistoryMessages(roomId, gapStartSyncId).then((missingMessages) => {
      upsertRoomMessagesToQueryAndDisk(roomId, missingMessages, deps);
    });
  }

  upsertRoomMessagesToQueryAndDisk(roomId, [message], deps);
}
