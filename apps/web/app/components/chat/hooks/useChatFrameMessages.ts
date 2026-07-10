import { useMemo } from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/localDb/useChatHistory";

import { filterVisibleChatMessages } from "@/components/chat/utils/hiddenDiceVisibility";

import type { ChatMessageResponse } from "../../../../api";

type UseChatFrameMessagesParams = {
  messagesOverride?: ChatMessageResponse[];
  chatHistory?: UseChatHistoryReturn;
  currentUserId?: number | null;
  currentMemberType?: number | null;
};

type UseChatFrameMessagesResult = {
  historyMessages: ChatMessageResponse[];
};

export default function useChatFrameMessages({
  messagesOverride,
  chatHistory,
  currentUserId,
  currentMemberType,
}: UseChatFrameMessagesParams): UseChatFrameMessagesResult {
  const historyMessages: ChatMessageResponse[] = useMemo(() => {
    if (messagesOverride) {
      return filterVisibleChatMessages(messagesOverride, {
        currentUserId,
        memberType: currentMemberType,
      });
    }
    const allMessages = filterVisibleChatMessages(chatHistory?.messages ?? [], {
      currentUserId,
      memberType: currentMemberType,
    });
    return allMessages;
  }, [chatHistory?.messages, currentMemberType, currentUserId, messagesOverride]);

  return {
    historyMessages,
  };
}
