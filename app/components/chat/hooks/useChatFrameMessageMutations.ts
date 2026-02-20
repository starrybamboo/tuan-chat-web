import type { UseMutationResult } from "@tanstack/react-query";

import { useCallback } from "react";
import { toast } from "react-hot-toast";

import type { RoomContextType } from "@/components/chat/core/roomContext";

import { useRoomUiStoreApi } from "@/components/chat/stores/roomUiStore";

import type { ApiResultMessage, ChatMessageResponse, Message } from "../../../../api";

type UseChatFrameMessageMutationsParams = {
  historyMessages: ChatMessageResponse[];
  roomContext: RoomContextType;
  deleteMessageMutation: UseMutationResult<ApiResultMessage, unknown, number, unknown>;
  updateMessageMutation: UseMutationResult<ApiResultMessage, unknown, Message, unknown>;
};

export default function useChatFrameMessageMutations({
  historyMessages,
  roomContext,
  deleteMessageMutation,
  updateMessageMutation,
}: UseChatFrameMessageMutationsParams) {
  const roomUiStoreApi = useRoomUiStoreApi();

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
              ...(targetMessage ?? {}),
              message: {
                ...(targetMessage?.message ?? {}),
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

  return { deleteMessage, updateMessage };
}
