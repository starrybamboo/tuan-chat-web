import type { UseMutationResult } from "@tanstack/react-query";

import { useCallback } from "react";

import type { RoomContextType } from "@/components/chat/core/roomContext";

import type { ApiResultMessage, ApiResultVoid, ChatMessageResponse, Message } from "../../../../api";

type UseChatFrameMessageMutationsParams = {
  historyMessages: ChatMessageResponse[];
  roomContext: RoomContextType;
  deleteMessageMutation: UseMutationResult<ApiResultVoid, unknown, number, unknown>;
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
      onSuccess: () => {
        const targetMessage = historyMessages.find(m => m.message.messageId === messageId);
        if (targetMessage && roomContext.chatHistory) {
          const updatedMessage = {
            ...targetMessage,
            message: {
              ...targetMessage.message,
              status: 1,
            },
          };
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
