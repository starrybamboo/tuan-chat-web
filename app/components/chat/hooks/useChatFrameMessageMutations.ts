import type { UseMutationResult } from "@tanstack/react-query";

import { useCallback } from "react";

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
  const deleteMessage = useCallback((messageId: number) => {
    deleteMessageMutation.mutate(messageId, {
      onSuccess: (response) => {
        if (!roomContext.chatHistory)
          return;
        const targetMessage = historyMessages.find(m => m.message.messageId === messageId);
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
  }, [deleteMessageMutation, historyMessages, roomContext.chatHistory]);

  const updateMessage = useCallback((message: Message) => {
    updateMessageMutation.mutate(message);
    const existingResponse = historyMessages.find(m => m.message.messageId === message.messageId);
    const newResponse = {
      ...existingResponse,
      message,
    };
    roomContext.chatHistory?.addOrUpdateMessage(newResponse as ChatMessageResponse);
  }, [updateMessageMutation, roomContext.chatHistory, historyMessages]);

  return { deleteMessage, updateMessage };
}
