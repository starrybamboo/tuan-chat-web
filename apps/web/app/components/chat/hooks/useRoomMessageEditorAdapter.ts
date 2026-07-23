import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ChatMessageResponse, Message } from "../../../../api";
import type {
  MessageEditorContentAdapter,
  MessageEditorMessage,
  MessageEditorRoomSyncProgress,
} from "../../messageEditor/messageEditorTypes";
import type { RoomMessageEditSyncStatus } from "../infra/localDb/roomMessageEditSync";

import {
  fillMissingMessageEditorMediaLayouts,
  materializeMessageEditorRoomQueryMessages,
} from "../../messageEditor/model/messageEditorTransforms";
import { getRoomMessagesFromQueryCache } from "../infra/localDb/roomHistoryQueryCache";
import { getRoomMessageEditorSyncEntry } from "../infra/localDb/roomMessageEditSyncRegistry";

const INITIAL_STATUS: RoomMessageEditSyncStatus = {
  phase: "idle",
  problemClientIds: [],
  state: "clean",
};

type UseRoomMessageEditorAdapterParams = {
  messages: ChatMessageResponse[];
  roomId: number;
};

function toSyncProgress(status: RoomMessageEditSyncStatus): MessageEditorRoomSyncProgress {
  return { phase: status.phase };
}

/** 房间文档 adapter：Query 是唯一渲染源，保存复用 room-message pending/confirmed 生命周期。 */
export function useRoomMessageEditorAdapter({
  messages,
  roomId,
}: UseRoomMessageEditorAdapterParams) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [deletedCount, setDeletedCount] = useState(0);
  const syncEntry = useMemo(
    () => getRoomMessageEditorSyncEntry(queryClient, roomId, {
      prepareConfirmedMessage: (confirmed, optimistic) => {
        if (!optimistic) return confirmed;
        return fillMissingMessageEditorMediaLayouts(
          [confirmed as MessageEditorMessage],
          [optimistic as MessageEditorMessage],
        )[0] as Message;
      },
    }),
    [queryClient, roomId],
  );
  const coordinator = syncEntry.coordinator;

  useEffect(() => {
    setStatus(syncEntry.status);
    syncEntry.listeners.add(setStatus);
    return () => {
      syncEntry.listeners.delete(setStatus);
    };
  }, [syncEntry]);

  const applyChange = useCallback<MessageEditorContentAdapter["applyChange"]>((change) => {
    const nextMessages = materializeMessageEditorRoomQueryMessages(
      change.messages,
      roomId,
      { structureChanged: change.structureChanged },
    );
    const previousMessages = materializeMessageEditorRoomQueryMessages(change.previousMessages, roomId);
    coordinator.edit(
      nextMessages.map(message => ({ message: message as Message })),
      previousMessages.map(message => ({ message: message as Message })),
    );
    return getRoomMessagesFromQueryCache(queryClient, roomId).map(item => item.message);
  }, [coordinator, queryClient, roomId]);

  const clear = useCallback(() => {
    setDeletedCount(messages.length);
    coordinator.edit([]);
  }, [coordinator, messages.length]);

  useEffect(() => {
    if (status.state === "clean") setDeletedCount(0);
  }, [status.state]);

  const adapter = useMemo<MessageEditorContentAdapter>(() => ({
    applyChange,
    identity: `room:${roomId}`,
    messages: messages.map(item => item.message),
    ready: true,
    saveState: status.phase === "cloudSaving"
      ? "saving"
      : status.state === "error"
        ? "error"
        : status.state === "syncing"
          ? "dirty"
          : status.phase === "synced"
            ? "saved"
            : "idle",
  }), [applyChange, messages, roomId, status.phase, status.state]);

  return {
    adapter,
    clear,
    deletedCount,
    problemBlockIds: new Set(status.problemClientIds),
    progress: toSyncProgress(status),
    state: status.state,
  };
}
