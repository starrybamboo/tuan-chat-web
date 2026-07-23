import type { QueryClient } from "@tanstack/react-query";

import type { Message } from "../../../../../api";
import type { RoomMessageEditSyncStatus } from "./roomMessageEditSync";

import { patchRemoteRoomMessageStream } from "../doc/document/roomMessageStreamApi";
import {
  addPendingRoomMessages,
  promotePendingRoomMessage,
  replaceConfirmedRoomMessages,
  rollbackPendingRoomMessages,
} from "./chatHistoryDb";
import {
  getRoomHistoryRuntime,
  getRoomMessagesFromQueryCache,
  updateRoomMessagesQueryCache,
} from "./roomHistoryQueryCache";
import { RoomMessageEditSyncCoordinator } from "./roomMessageEditSync";

export type RoomMessageEditorSyncEntry = {
  coordinator: RoomMessageEditSyncCoordinator;
  listeners: Set<(status: RoomMessageEditSyncStatus) => void>;
  status: RoomMessageEditSyncStatus;
};

type RoomMessageEditorSyncEntryOptions = {
  prepareConfirmedMessage(confirmed: Message, optimistic?: Message): Message;
};

const INITIAL_STATUS: RoomMessageEditSyncStatus = {
  phase: "idle",
  problemClientIds: [],
  state: "clean",
};

const syncEntriesByQueryClient = new WeakMap<QueryClient, Map<number, RoomMessageEditorSyncEntry>>();

/** 返回房间级共享同步实例，使防抖和在途批次不依赖文档视图挂载周期。 */
export function getRoomMessageEditorSyncEntry(
  queryClient: QueryClient,
  roomId: number,
  options: RoomMessageEditorSyncEntryOptions,
): RoomMessageEditorSyncEntry {
  let entriesByRoom = syncEntriesByQueryClient.get(queryClient);
  if (!entriesByRoom) {
    entriesByRoom = new Map();
    syncEntriesByQueryClient.set(queryClient, entriesByRoom);
  }
  const current = entriesByRoom.get(roomId);
  if (current) return current;

  const entry = {
    coordinator: null as unknown as RoomMessageEditSyncCoordinator,
    listeners: new Set<(status: RoomMessageEditSyncStatus) => void>(),
    status: INITIAL_STATUS,
  };
  entry.coordinator = new RoomMessageEditSyncCoordinator(roomId, {
    addPendingMessages: addPendingRoomMessages,
    getQueryMessages: () => getRoomMessagesFromQueryCache(queryClient, roomId),
    onPersistenceError: error => console.error("[room-message-edit] confirmed cache write failed", error),
    onStatus: (status) => {
      entry.status = status;
      for (const listener of entry.listeners) listener(status);
    },
    patch: operations => patchRemoteRoomMessageStream({
      mutationMeta: { operationCause: "normal", sourceSurface: "doc_view" },
      operations,
      roomId,
    }),
    prepareConfirmedMessage: options.prepareConfirmedMessage,
    promotePendingMessage: promotePendingRoomMessage,
    registerMessageAlias: (localMessageId, confirmedMessageId) => {
      getRoomHistoryRuntime(queryClient, roomId).messageIdAliases.set(localMessageId, {
        toMessageId: confirmedMessageId,
        updatedAt: Date.now(),
      });
    },
    replaceConfirmedMessages: replaceConfirmedRoomMessages,
    replaceQueryMessages: updater => updateRoomMessagesQueryCache(queryClient, roomId, updater),
    rollbackPendingMessages: rollbackPendingRoomMessages,
    scheduler: {
      clear: timer => window.clearTimeout(timer as number),
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
    },
    setProtection: (protection) => {
      const runtime = getRoomHistoryRuntime(queryClient, roomId);
      runtime.editorDirtyMessageIds = new Set(protection.dirtyMessageIds);
      runtime.editorDeletedMessageIds = new Set(protection.deletedMessageIds);
    },
  });
  entriesByRoom.set(roomId, entry);
  return entry;
}

/** 账号或 Query 会话重置时废弃所有房间同步状态和旧响应。 */
export function resetRoomMessageEditorSyncEntries(queryClient: QueryClient): void {
  const entriesByRoom = syncEntriesByQueryClient.get(queryClient);
  if (!entriesByRoom) return;
  for (const entry of entriesByRoom.values()) entry.coordinator.reset();
  syncEntriesByQueryClient.delete(queryClient);
}
