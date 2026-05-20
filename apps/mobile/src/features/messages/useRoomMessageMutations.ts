import { useQueryClient } from "@tanstack/react-query";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { mobileApiClient } from "@/lib/api";
import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";
import { getAllRoomMessagesQueryKey } from "@tuanchat/query/chat";
import { markRoomMessageDeletedData, markRoomMessagesDeleted } from "@tuanchat/query/room-message";
import {
  restoreRoomMessageInList,
  restoreRoomMessagesInList,
} from "@tuanchat/query/room-message-lifecycle";

import { markCachedRoomMessagesDeleted, writeCachedRoomMessages } from "./mobileRoomMessageCache";

export function useEditRoomMessageMutation(roomId: number | null) {
  const queryClient = useQueryClient();

  const editMessage = async (updatedMessage: Message) => {
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId <= 0) {
      throw new Error("请先选择一个房间。");
    }
    const messageId = updatedMessage.messageId;
    if (!messageId) {
      throw new Error("消息 ID 无效。");
    }

    const queryKey = getAllRoomMessagesQueryKey(resolvedRoomId);
    const currentMessages = queryClient.getQueryData<ChatMessageResponse[]>(queryKey) ?? [];
    const snapshot = currentMessages.find(m => m.message?.messageId === messageId);
    if (!snapshot) {
      throw new Error("找不到要编辑的消息。");
    }

    queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
      (current ?? []).map(m =>
        m.message?.messageId === messageId ? { message: updatedMessage } : m,
      ));

    try {
      const result = await mobileApiClient.chatController.updateMessage(updatedMessage);
      if (result?.success && result.data) {
        queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
          (current ?? []).map(m =>
            m.message?.messageId === messageId ? { message: result.data! } : m,
          ));
        void writeCachedRoomMessages(resolvedRoomId, [{ message: result.data }]).catch(() => {});
      }
      else {
        queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
          restoreRoomMessageInList(current, snapshot));
        throw new Error("编辑消息失败。");
      }
      return result;
    }
    catch (error) {
      queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
        restoreRoomMessageInList(current, snapshot));
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
    const currentMessages = queryClient.getQueryData<ChatMessageResponse[]>(queryKey) ?? [];
    const snapshot = currentMessages.find(m => m.message?.messageId === messageId);
    if (!snapshot) {
      throw new Error("找不到要删除的消息。");
    }

    queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
      markRoomMessageDeletedData(current, messageId));
    void markCachedRoomMessagesDeleted(resolvedRoomId, [messageId]).catch(() => {});

    try {
      const result = await mobileApiClient.chatController.deleteMessage(messageId);
      if (!result?.success) {
        queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
          restoreRoomMessageInList(current, snapshot));
        void writeCachedRoomMessages(resolvedRoomId, [snapshot]).catch(() => {});
        throw new Error("删除消息失败。");
      }
      if (result.data) {
        queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
          (current ?? []).map(m =>
            m.message?.messageId === messageId ? { message: result.data! } : m,
          ));
        void writeCachedRoomMessages(resolvedRoomId, [{ message: result.data }]).catch(() => {});
      }
      return result;
    }
    catch (error) {
      queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
        restoreRoomMessageInList(current, snapshot));
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
    const currentMessages = queryClient.getQueryData<ChatMessageResponse[]>(queryKey) ?? [];
    const snapshots = messageIds
      .map(id => currentMessages.find(m => m.message?.messageId === id))
      .filter((s): s is ChatMessageResponse => s != null);

    queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
      markRoomMessagesDeleted(current, messageIds));
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
      queryClient.setQueryData<ChatMessageResponse[]>(queryKey, current =>
        restoreRoomMessagesInList(current, failedSnapshots));
      void writeCachedRoomMessages(resolvedRoomId, failedSnapshots).catch(() => {});
      throw new Error(`${failedSnapshots.length} 条消息删除失败。`);
    }
  };

  return { deleteMessage, deleteMessages };
}
