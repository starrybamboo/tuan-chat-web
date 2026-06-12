import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { useQueryClient } from "@tanstack/react-query";
import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";
import { getAllRoomMessagesQueryKey } from "@tuanchat/query/chat";
import {
  restoreRoomMessageInList,
  restoreRoomMessagesInList,
} from "@tuanchat/query/room-message-lifecycle";

import { mobileApiClient } from "@/lib/api";

import type { RoomMessagesQueryData } from "./roomMessagesQueryData";

import {
  markCachedRoomMessagesDeleted,
  readCachedRoomMessages,
  writeCachedRoomMessages,
} from "./mobileRoomMessageCache";
import { resolveRoomMessageSnapshots } from "./roomMessageMutationSnapshots";
import { extractRoomMessagesFromQueryData, updateRoomMessagesQueryData } from "./roomMessagesQueryData";

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

    const queryKey = getAllRoomMessagesQueryKey(resolvedRoomId);
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

    queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
      restoreRoomMessageInList(messages, createMessageSnapshot(updatedMessage))));

    try {
      const result = await mobileApiClient.chatController.updateMessage(updatedMessage);
      const nextMessage = result?.success ? result.data : undefined;
      if (nextMessage) {
        queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
          restoreRoomMessageInList(messages, createMessageSnapshot(nextMessage))));
        void writeCachedRoomMessages(resolvedRoomId, [{ message: nextMessage }]).catch(() => {});
      }
      else {
        queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
          restoreRoomMessageInList(messages, snapshot)));
        throw new Error("编辑消息失败。");
      }
      return result;
    }
    catch (error) {
      queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
        restoreRoomMessageInList(messages, snapshot)));
      throw new Error(extractOpenApiErrorMessage(error, "编辑消息失败。"));
    }
  };

  return { editMessage };
}

export function useDeleteRoomMessageMutation(roomId: number | null) {
  const queryClient = useQueryClient();

  const deleteMessage = async (messageId: number) => {
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId <= 0) {
      throw new Error("请先选择一个房间。");
    }

    const queryKey = getAllRoomMessagesQueryKey(resolvedRoomId);
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

    queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
      restoreRoomMessageInList(messages, createDeletedMessageSnapshot(snapshot))));
    void markCachedRoomMessagesDeleted(resolvedRoomId, [messageId]).catch(() => {});

    try {
      const result = await mobileApiClient.chatController.deleteMessage(messageId);
      if (!result?.success) {
        queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
          restoreRoomMessageInList(messages, snapshot)));
        void writeCachedRoomMessages(resolvedRoomId, [snapshot]).catch(() => {});
        throw new Error("删除消息失败。");
      }
      const nextMessage = result.data;
      if (nextMessage) {
        queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
          restoreRoomMessageInList(messages, createMessageSnapshot(nextMessage))));
        void writeCachedRoomMessages(resolvedRoomId, [{ message: nextMessage }]).catch(() => {});
      }
      return result;
    }
    catch (error) {
      queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
        restoreRoomMessageInList(messages, snapshot)));
      void writeCachedRoomMessages(resolvedRoomId, [snapshot]).catch(() => {});
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

    const queryKey = getAllRoomMessagesQueryKey(resolvedRoomId);
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
    void markCachedRoomMessagesDeleted(resolvedRoomId, messageIds).catch(() => {});

    const failedSnapshots: ChatMessageResponse[] = [];
    for (const messageId of messageIds) {
      try {
        const result = await mobileApiClient.chatController.deleteMessage(messageId);
        if (!result?.success) {
          const snap = snapshots.find(s => s.message?.messageId === messageId);
          if (snap)
            failedSnapshots.push(snap);
        }
      }
      catch {
        const snap = snapshots.find(s => s.message?.messageId === messageId);
        if (snap)
          failedSnapshots.push(snap);
      }
    }

    if (failedSnapshots.length > 0) {
      queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, messages =>
        restoreRoomMessagesInList(messages, failedSnapshots)));
      void writeCachedRoomMessages(resolvedRoomId, failedSnapshots).catch(() => {});
      throw new Error(`${failedSnapshots.length} 条消息删除失败。`);
    }
  };

  return { deleteMessage, deleteMessages };
}
