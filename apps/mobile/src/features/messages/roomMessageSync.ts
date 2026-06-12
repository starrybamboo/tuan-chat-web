import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { getAllRoomMessagesQueryKey } from "@tuanchat/query/chat";
import {
  getMaxRoomMessageSyncId,
  getRoomMessageSyncGapStart,
} from "@tuanchat/query/room-message";
import { mergeRoomMessagesForLocalState } from "@tuanchat/query/room-message-lifecycle";

import type {
  RoomMessagesQueryData,
  RoomMessagesSyncResult,
} from "./roomMessagesQueryData";

import {
  extractRoomMessagesFromQueryData,
  updateRoomMessagesQueryData,
} from "./roomMessagesQueryData";

export type { RoomMessagesSyncResult } from "./roomMessagesQueryData";

type RoomMessageSyncClient = {
  chatController: {
    getHistoryMessages: (request: { roomId: number; syncId: number }) => Promise<unknown>;
  };
};

export type FetchRoomMessagesWithLocalSyncDeps = {
  client: RoomMessageSyncClient;
  getMaxCachedSyncId: (roomId: number) => Promise<number>;
};

type RoomMessageQueryCache = {
  getQueryData: (queryKey: readonly unknown[]) => RoomMessagesQueryData;
  setQueryData: (
    queryKey: readonly unknown[],
    updater: (currentData: RoomMessagesQueryData) => RoomMessagesQueryData,
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

  const result = await deps.client.chatController.getHistoryMessages({
    roomId,
    syncId: 0,
  });
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
  deps.queryClient.setQueryData(queryKey, currentData => updateRoomMessagesQueryData(
    currentData,
    currentMessages => mergeRoomMessagesForLocalState(currentMessages, incomingMessages),
  ));
  persistRoomMessages(roomId, incomingMessages, deps.writeCachedRoomMessages);
}

export function upsertLiveRoomMessageWithGapRepair(
  roomId: number,
  message: ChatMessageResponse,
  deps: UpsertRoomMessagesToQueryAndDiskDeps,
) {
  upsertLiveRoomMessagesWithGapRepair(roomId, [message], deps);
}

export function upsertLiveRoomMessagesWithGapRepair(
  roomId: number,
  messages: ChatMessageResponse[],
  deps: UpsertRoomMessagesToQueryAndDiskDeps,
) {
  if (!Number.isInteger(roomId) || roomId <= 0 || messages.length === 0) {
    return;
  }

  const queryKey = getAllRoomMessagesQueryKey(roomId);
  const currentMessages = extractRoomMessagesFromQueryData(deps.queryClient.getQueryData(queryKey));
  const gapStartSyncId = messages.length === 1
    ? getRoomMessageSyncGapStart(currentMessages, messages[0])
    : getBatchRoomMessageSyncGapStart(currentMessages, messages);

  if (gapStartSyncId != null) {
    void deps.fetchHistoryMessages(roomId, gapStartSyncId).then((missingMessages) => {
      upsertRoomMessagesToQueryAndDisk(roomId, missingMessages, deps);
    });
  }

  upsertRoomMessagesToQueryAndDisk(roomId, messages, deps);
}

function getBatchRoomMessageSyncGapStart(
  currentMessages: ChatMessageResponse[],
  incomingMessages: ChatMessageResponse[],
): number | null {
  const maxKnownSyncId = getMaxRoomMessageSyncId(currentMessages);
  const incomingSyncIds = incomingMessages
    .map(item => item.message?.syncId)
    .filter((syncId): syncId is number => typeof syncId === "number" && Number.isFinite(syncId) && syncId > maxKnownSyncId);
  if (incomingSyncIds.length === 0) {
    return null;
  }

  const incomingSyncIdSet = new Set(incomingSyncIds);
  const maxIncomingSyncId = Math.max(...incomingSyncIds);
  for (let expectedSyncId = maxKnownSyncId + 1; expectedSyncId <= maxIncomingSyncId; expectedSyncId += 1) {
    if (!incomingSyncIdSet.has(expectedSyncId)) {
      return expectedSyncId;
    }
  }
  return null;
}
