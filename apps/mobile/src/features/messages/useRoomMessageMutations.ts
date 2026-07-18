import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { useQueryClient } from "@tanstack/react-query";
import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";
import {
  restoreRoomMessageInList,
  restoreRoomMessageIfCurrentMatches,
  restoreRoomMessagesInList,
} from "@tuanchat/query/room-message-lifecycle";

import { mobileApiClient } from "@/lib/api";

import type { RoomMessagesQueryData } from "./roomMessagesQueryData";

import {
  readCachedRoomMessages,
  writeCachedRoomMessages,
} from "./mobileRoomMessageCache";
import { resolveMovedRoomMessagePosition } from "./roomMessageMovePosition";
import { resolveRoomMessageSnapshots } from "./roomMessageMutationSnapshots";
import { extractRoomMessagesFromQueryData, updateRoomMessagesQueryData } from "./roomMessagesQueryData";
import { getRoomMessagesQueryKey } from "./roomMessagesQueryKey";

function createMessageSnapshot(message: Message): ChatMessageResponse {
  return { message };
}

function createDeletedMessageSnapshot(snapshot: ChatMessageResponse): ChatMessageResponse {
  return {
    message: {
      ...snapshot.message,
      status: 1,
    },
  };
}

function reportRoomMessageCacheFailure(operation: string, error: unknown): void {
  console.warn(`[useRoomMessageMutations] ${operation}的磁盘缓存同步失败:`, error);
}

export function useEditRoomMessageMutation(roomId: number | null) {
  const queryClient = useQueryClient();

  const editMessage = async ({
    originalMessage,
    updatedMessage,
  }: {
    originalMessage: Message;
    updatedMessage: Message;
  }) => {
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId <= 0) {
      throw new Error("请先选择一个房间。");
    }
    const messageId = updatedMessage.messageId;
    if (!messageId) {
      throw new Error("消息 ID 无效。");
    }

    const queryKey = getRoomMessagesQueryKey(resolvedRoomId);
    const currentMessages = extractRoomMessagesFromQueryData(
      queryClient.getQueryData<RoomMessagesQueryData>(queryKey),
    );
    const snapshot = resolveRoomMessageSnapshots({
      fallbackMessages: [originalMessage],
      messageIds: [messageId],
      queryMessages: currentMessages,
    })[0];
    if (!snapshot) {
      throw new Error("找不到要编辑的消息。");
    }

    const optimisticSnapshot = createMessageSnapshot(updatedMessage);
    queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
      restoreRoomMessageInList(messages, optimisticSnapshot)));

    try {
      const result = await mobileApiClient.chatController.updateMessage(updatedMessage);
      const nextMessage = result?.success ? result.data : undefined;
      if (nextMessage) {
        queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
          restoreRoomMessageInList(messages, createMessageSnapshot(nextMessage))));
        void writeCachedRoomMessages(resolvedRoomId, [{ message: nextMessage }])
          .catch(error => reportRoomMessageCacheFailure("写入已确认编辑消息", error));
      }
      else {
        throw new Error("编辑消息失败。");
      }
      return result;
    }
    catch (error) {
      queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
        restoreRoomMessageIfCurrentMatches(messages, optimisticSnapshot, snapshot)));
      throw new Error(extractOpenApiErrorMessage(error, "编辑消息失败。"));
    }
  };

  return { editMessage };
}

export function useMoveRoomMessageMutation(roomId: number | null) {
  const queryClient = useQueryClient();

  const moveMessage = async ({
    movingMessage,
    placement,
    targetMessage,
  }: {
    movingMessage: Message;
    placement?: "after" | "before";
    targetMessage: Message;
  }) => {
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId <= 0) {
      throw new Error("请先选择一个房间。");
    }
    const messageId = movingMessage.messageId;
    if (!messageId) {
      throw new Error("消息 ID 无效。");
    }
    if (!targetMessage.messageId || targetMessage.messageId === messageId) {
      return;
    }

    const queryKey = getRoomMessagesQueryKey(resolvedRoomId);
    const currentMessages = extractRoomMessagesFromQueryData(
      queryClient.getQueryData<RoomMessagesQueryData>(queryKey),
    );
    const snapshot = resolveRoomMessageSnapshots({
      fallbackMessages: [movingMessage],
      messageIds: [messageId],
      queryMessages: currentMessages,
    })[0];
    if (!snapshot) {
      throw new Error("找不到要移动的消息。");
    }

    const nextPosition = resolveMovedRoomMessagePosition({
      messages: currentMessages,
      movingMessage,
      placement,
      targetMessage,
    });
    const optimisticMessage = {
      ...snapshot.message,
      position: nextPosition,
    };
    const optimisticSnapshot = createMessageSnapshot(optimisticMessage);
    queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
      restoreRoomMessageInList(messages, optimisticSnapshot)));

    try {
      const result = await mobileApiClient.chatController.patchRoomMessages({
        mutationMeta: {
          operationCause: "normal",
          sourceSurface: "chat_input",
        },
        operations: [{
          messageId,
          op: "move",
          position: nextPosition,
        }],
        roomId: resolvedRoomId,
      });
      if (!result?.success) {
        throw new Error("移动消息失败。");
      }
      const nextMessage = (result.data ?? []).find(message => message?.messageId === messageId);
      if (!nextMessage) {
        throw new Error("移动消息成功，但服务端未返回更新后的消息。");
      }
      queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
        restoreRoomMessageInList(messages, createMessageSnapshot(nextMessage))));
      void writeCachedRoomMessages(resolvedRoomId, [{ message: nextMessage }])
        .catch(error => reportRoomMessageCacheFailure("写入已确认移动消息", error));
      return result;
    }
    catch (error) {
      queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
        restoreRoomMessageIfCurrentMatches(messages, optimisticSnapshot, snapshot)));
      throw new Error(extractOpenApiErrorMessage(error, "移动消息失败。"));
    }
  };

  return { moveMessage };
}

export function useDeleteRoomMessageMutation(roomId: number | null) {
  const queryClient = useQueryClient();

  const deleteMessage = async (messageId: number) => {
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId <= 0) {
      throw new Error("请先选择一个房间。");
    }

    const queryKey = getRoomMessagesQueryKey(resolvedRoomId);
    const currentMessages = extractRoomMessagesFromQueryData(
      queryClient.getQueryData<RoomMessagesQueryData>(queryKey),
    );
    let snapshot = resolveRoomMessageSnapshots({
      messageIds: [messageId],
      queryMessages: currentMessages,
    })[0];
    if (!snapshot) {
      snapshot = resolveRoomMessageSnapshots({
        cachedMessages: await readCachedRoomMessages(resolvedRoomId),
        messageIds: [messageId],
        queryMessages: currentMessages,
      })[0];
    }
    if (!snapshot) {
      throw new Error("找不到要删除的消息。");
    }

    const optimisticSnapshot = createDeletedMessageSnapshot(snapshot);
    queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
      restoreRoomMessageInList(messages, optimisticSnapshot)));

    try {
      const result = await mobileApiClient.chatController.deleteMessage(messageId);
      if (!result?.success) {
        throw new Error("删除消息失败。");
      }
      const nextMessage = result.data;
      const confirmedSnapshot = nextMessage ? createMessageSnapshot(nextMessage) : optimisticSnapshot;
      if (nextMessage) {
        queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
          restoreRoomMessageInList(messages, confirmedSnapshot)));
      }
      void writeCachedRoomMessages(resolvedRoomId, [confirmedSnapshot])
        .catch(error => reportRoomMessageCacheFailure("写入已确认删除消息", error));
      return result;
    }
    catch (error) {
      queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, (messages) => {
        return restoreRoomMessageIfCurrentMatches(messages, optimisticSnapshot, snapshot);
      }));
      throw new Error(extractOpenApiErrorMessage(error, "删除消息失败。"));
    }
  };

  const deleteMessages = async (messageIds: number[]) => {
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId <= 0) {
      throw new Error("请先选择一个房间。");
    }
    if (messageIds.length === 0)
      return;

    const queryKey = getRoomMessagesQueryKey(resolvedRoomId);
    const currentMessages = extractRoomMessagesFromQueryData(queryClient.getQueryData(queryKey));
    let snapshots = resolveRoomMessageSnapshots({
      messageIds,
      queryMessages: currentMessages,
    });
    if (snapshots.length < messageIds.length) {
      snapshots = resolveRoomMessageSnapshots({
        cachedMessages: await readCachedRoomMessages(resolvedRoomId),
        messageIds,
        queryMessages: currentMessages,
      });
    }
    const deletedSnapshots = snapshots.map(createDeletedMessageSnapshot);

    queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
      restoreRoomMessagesInList(messages, deletedSnapshots)));

    const confirmedSnapshots: ChatMessageResponse[] = [];
    const failedSnapshots: ChatMessageResponse[] = [];
    for (const messageId of messageIds) {
      try {
        const result = await mobileApiClient.chatController.deleteMessage(messageId);
        if (!result?.success || !result.data) {
          const snap = snapshots.find(s => s.message?.messageId === messageId);
          if (snap)
            failedSnapshots.push(snap);
        }
        else {
          confirmedSnapshots.push({ message: result.data });
        }
      }
      catch {
        const snap = snapshots.find(s => s.message?.messageId === messageId);
        if (snap)
          failedSnapshots.push(snap);
      }
    }

    if (confirmedSnapshots.length > 0) {
      void writeCachedRoomMessages(resolvedRoomId, confirmedSnapshots)
        .catch(error => reportRoomMessageCacheFailure("写入已确认批量删除消息", error));
    }

    if (failedSnapshots.length > 0) {
      queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, (messages) => {
        const optimisticById = new Map(deletedSnapshots.map(item => [item.message.messageId, item]));
        const rolledBackSnapshots = failedSnapshots.filter((snapshot) => {
          const optimistic = optimisticById.get(snapshot.message.messageId);
          return optimistic && messages.some(item => item.message === optimistic.message);
        });
        return restoreRoomMessagesInList(messages, rolledBackSnapshots);
      }));
      throw new Error(`${failedSnapshots.length} 条消息删除失败。`);
    }
  };

  return { deleteMessage, deleteMessages };
}
