import { useMemo } from "react";

import type { ChatMessageResponse } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";

type UseRoomMainHistoryMessagesParams = {
  historyMessages?: ChatMessageResponse[];
};

export default function useRoomMainHistoryMessages({
  historyMessages,
}: UseRoomMainHistoryMessagesParams): ChatMessageResponse[] {
  return useMemo(() => {
    return (historyMessages ?? []).filter((m) => {
      if (m.message.messageType === MessageType.THREAD_ROOT) {
        return false;
      }
      const threadId = m.message.threadId;
      return !threadId || threadId === m.message.messageId;
    });
  }, [historyMessages]);
}
