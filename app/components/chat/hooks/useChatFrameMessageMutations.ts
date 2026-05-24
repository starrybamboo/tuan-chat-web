import type { UseMutationResult } from "@tanstack/react-query";

import { useCallback } from "react";
import { toast } from "react-hot-toast";

import type { RoomContextType } from "@/components/chat/core/roomContext";

import { useRoomUiStoreApi } from "@/components/chat/stores/roomUiStore";

import type {
  ApiResultListMessage,
  ApiResultMessage,
  ChatMessageResponse,
  Message,
  RoomMessageStreamItem,
  RoomMessageStreamPatchOperation,
  RoomMessageStreamPatchRequest,
} from "../../../../api";

type UseChatFrameMessageMutationsParams = {
  historyMessages: ChatMessageResponse[];
  roomContext: RoomContextType;
  deleteMessageMutation: UseMutationResult<ApiResultMessage, unknown, number, unknown>;
  updateMessageMutation: UseMutationResult<ApiResultMessage, unknown, Message, unknown>;
  patchMessagesMutation: UseMutationResult<ApiResultListMessage, unknown, RoomMessageStreamPatchRequest, unknown>;
};

export default function useChatFrameMessageMutations({
  historyMessages,
  roomContext,
  deleteMessageMutation,
  updateMessageMutation,
  patchMessagesMutation,
}: UseChatFrameMessageMutationsParams) {
  const roomUiStoreApi = useRoomUiStoreApi();

  const toPatchItem = useCallback((message: Message): RoomMessageStreamItem => ({
    messageType: message.messageType,
    content: message.content ?? "",
    ...(Array.isArray(message.annotations) && message.annotations.length > 0 ? { annotations: message.annotations } : {}),
    ...(message.extra ? { extra: message.extra } : {}),
    ...(message.webgal !== undefined ? { webgal: message.webgal } : {}),
    ...(typeof message.roleId === "number" ? { roleId: message.roleId } : {}),
    ...(typeof message.avatarId === "number" ? { avatarId: message.avatarId } : {}),
    ...(typeof message.customRoleName === "string" ? { customRoleName: message.customRoleName } : {}),
    ...(typeof message.replyMessageId === "number" ? { replayMessageId: message.replyMessageId } : {}),
    ...(typeof message.position === "number" ? { position: message.position } : {}),
  }), []);

  const deleteMessage = useCallback((messageId: number) => {
    if (!Number.isFinite(messageId) || messageId <= 0) {
      return;
    }

    const targetMessage = historyMessages.find(m => m.message.messageId === messageId);
    const optimisticDeletedMessage: ChatMessageResponse | null = targetMessage
      ? {
          ...targetMessage,
          message: {
            ...targetMessage.message,
            status: 1,
            updateTime: new Date().toISOString(),
          },
        }
      : null;

    if (optimisticDeletedMessage) {
      roomContext.chatHistory?.addOrUpdateMessage(optimisticDeletedMessage);
    }

    deleteMessageMutation.mutate(messageId, {
      onSuccess: (response) => {
        if (!roomContext.chatHistory)
          return;
        if (targetMessage && targetMessage.message.status !== 1) {
          roomUiStoreApi.getState().pushMessageUndo({ type: "delete", before: targetMessage.message });
        }
        const serverMessage = response?.data;
        const updatedMessage: ChatMessageResponse | null = serverMessage
          ? {
              ...targetMessage,
              message: {
                ...targetMessage?.message,
                ...serverMessage,
              },
            }
          : (targetMessage
              ? {
                  ...targetMessage,
                  message: {
                    ...targetMessage.message,
                    status: 1,
                  },
                }
              : null);

        if (updatedMessage) {
          roomContext.chatHistory.addOrUpdateMessage(updatedMessage);
        }
      },
      onError: (error) => {
        console.error("删除消息失败", error);
        if (targetMessage) {
          roomContext.chatHistory?.addOrUpdateMessage(targetMessage);
        }
        toast.error("删除消息失败，已恢复原消息");
      },
    });
  }, [deleteMessageMutation, historyMessages, roomContext.chatHistory, roomUiStoreApi]);

  const deleteMessages = useCallback((messageIds: number[]) => {
    const normalizedMessageIds = Array.from(new Set(
      messageIds.filter(messageId => Number.isFinite(messageId) && messageId > 0),
    ));
    if (normalizedMessageIds.length === 0) {
      return;
    }

    const targetMessages = normalizedMessageIds
      .map(messageId => historyMessages.find(m => m.message.messageId === messageId))
      .filter((message): message is ChatMessageResponse => Boolean(message));
    const optimisticDeletedMessages = targetMessages.map(targetMessage => ({
      ...targetMessage,
      message: {
        ...targetMessage.message,
        status: 1,
        updateTime: new Date().toISOString(),
      },
    }));

    if (optimisticDeletedMessages.length > 0) {
      void roomContext.chatHistory?.addOrUpdateMessages(optimisticDeletedMessages);
    }

    const operations: RoomMessageStreamPatchOperation[] = normalizedMessageIds.map(messageId => ({
      op: "delete",
      messageId,
    }));
    patchMessagesMutation.mutate({ operations }, {
      onSuccess: (response) => {
        if (!roomContext.chatHistory)
          return;
        for (const targetMessage of targetMessages) {
          if (targetMessage.message.status !== 1) {
            roomUiStoreApi.getState().pushMessageUndo({ type: "delete", before: targetMessage.message });
          }
        }
        const serverMessageById = new Map((response?.data ?? []).map(message => [message.messageId, message]));
        const committedMessages = targetMessages
          .map((targetMessage) => {
            const committedMessage = serverMessageById.get(targetMessage.message.messageId)
              ?? {
                ...targetMessage.message,
                status: 1,
              };
            return {
              ...targetMessage,
              message: committedMessage,
            };
          });
        if (committedMessages.length > 0) {
          void roomContext.chatHistory.addOrUpdateMessages(committedMessages);
        }
      },
      onError: (error) => {
        console.error("批量删除消息失败", error);
        if (targetMessages.length > 0) {
          void roomContext.chatHistory?.addOrUpdateMessages(targetMessages);
        }
        toast.error("批量删除消息失败，已恢复原消息");
      },
    });
  }, [historyMessages, patchMessagesMutation, roomContext.chatHistory, roomUiStoreApi]);

  const updateMessages = useCallback((messages: Message[]) => {
    const dedupedMessages = Array.from(new Map(
      messages
        .filter(message => Number.isFinite(message.messageId) && message.messageId > 0)
        .map(message => [message.messageId, message]),
    ).values());
    const pendingUpdates = dedupedMessages.filter((message) => {
      const existingResponse = historyMessages.find(m => m.message.messageId === message.messageId);
      return existingResponse
        ? JSON.stringify(existingResponse.message) !== JSON.stringify(message)
        : true;
    });

    if (pendingUpdates.length === 0) {
      return;
    }

    const existingResponseById = new Map(
      pendingUpdates
        .map(message => historyMessages.find(m => m.message.messageId === message.messageId))
        .filter((message): message is ChatMessageResponse => Boolean(message))
        .map(message => [message.message.messageId, message]),
    );

    for (const message of pendingUpdates) {
      const existingResponse = existingResponseById.get(message.messageId);
      if (existingResponse) {
        roomUiStoreApi.getState().pushMessageUndo({
          type: "update",
          before: existingResponse.message,
          after: message,
        });
      }
    }

    const optimisticResponses = pendingUpdates.map((message) => {
      const existingResponse = existingResponseById.get(message.messageId);
      return existingResponse
        ? {
            ...existingResponse,
            message,
          }
        : { message } as ChatMessageResponse;
    });
    void roomContext.chatHistory?.addOrUpdateMessages(optimisticResponses);

    const operations: RoomMessageStreamPatchOperation[] = pendingUpdates.map(message => ({
      op: "update",
      messageId: message.messageId,
      message: toPatchItem(message),
    }));
    patchMessagesMutation.mutate({ operations }, {
      onSuccess: (response) => {
        const committedMessages = response?.data ?? pendingUpdates;
        const committedResponses = committedMessages.map((message) => {
          const existingResponse = existingResponseById.get(message.messageId);
          return existingResponse
            ? {
                ...existingResponse,
                message,
              }
            : { message } as ChatMessageResponse;
        });
        void roomContext.chatHistory?.addOrUpdateMessages(committedResponses);
      },
      onError: (error) => {
        console.error("批量更新消息失败", error);
        const rollbackMessages = Array.from(existingResponseById.values());
        if (rollbackMessages.length > 0) {
          void roomContext.chatHistory?.addOrUpdateMessages(rollbackMessages);
        }
        toast.error("批量更新消息失败，已恢复原内容");
      },
    });
  }, [historyMessages, patchMessagesMutation, roomContext.chatHistory, roomUiStoreApi, toPatchItem]);

  const updateMessage = useCallback((message: Message) => {
    const existingResponse = historyMessages.find(m => m.message.messageId === message.messageId);
    const hasChanges = existingResponse
      ? JSON.stringify(existingResponse.message) !== JSON.stringify(message)
      : true;

    if (!hasChanges) {
      return;
    }

    if (existingResponse) {
      roomUiStoreApi.getState().pushMessageUndo({
        type: "update",
        before: existingResponse.message,
        after: message,
      });
    }

    if (existingResponse) {
      roomContext.chatHistory?.addOrUpdateMessage({
        ...existingResponse,
        message,
      });
    }
    else {
      roomContext.chatHistory?.addOrUpdateMessage({ message });
    }

    updateMessageMutation.mutate(message, {
      onSuccess: (response) => {
        const committedMessage = response?.data ?? message;
        const committedResponse = existingResponse
          ? {
              ...existingResponse,
              message: committedMessage,
            }
          : { message: committedMessage };
        roomContext.chatHistory?.addOrUpdateMessage(committedResponse as ChatMessageResponse);
      },
      onError: (error) => {
        console.error("更新消息失败", error);
        if (existingResponse) {
          roomContext.chatHistory?.addOrUpdateMessage(existingResponse);
        }
        toast.error("更新消息失败，已恢复原内容");
      },
    });
  }, [historyMessages, roomContext.chatHistory, roomUiStoreApi, updateMessageMutation]);

  return {
    deleteMessage,
    deleteMessages,
    updateMessage,
    updateMessages,
  };
}
