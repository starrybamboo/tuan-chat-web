import type { UseMutationResult } from "@tanstack/react-query";

import { useCallback } from "react";
import { useRoomUiStoreApi } from "@/components/chat/stores/roomUiStore";

import type { RoomContextType } from "@/components/chat/core/roomContext";

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
    deleteMessageMutation.mutate(messageId, {
      onSuccess: (response) => {
        if (!roomContext.chatHistory)
          return;
        const targetMessage = historyMessages.find(m => m.message.messageId === messageId);
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
    });
  }, [deleteMessageMutation, historyMessages, roomContext.chatHistory, roomUiStoreApi]);

  const updateMessage = useCallback((message: Message) => {
    const existingResponse = historyMessages.find(m => m.message.messageId === message.messageId);
    if (existingResponse && JSON.stringify(existingResponse.message) !== JSON.stringify(message)) {
      roomUiStoreApi.getState().pushMessageUndo({
        type: "update",
        before: existingResponse.message,
        after: message,
      });
    }
    updateMessageMutation.mutate(message);
    const newResponse = {
      ...existingResponse,
      message,
    };
    roomContext.chatHistory?.addOrUpdateMessage(newResponse as ChatMessageResponse);
  }, [historyMessages, roomContext.chatHistory, roomUiStoreApi, updateMessageMutation]);

  return { deleteMessage, updateMessage };
}
