import { useCallback, useMemo } from "react";

import { useGlobalContext } from "@/components/globalContextProvider";

import type { ChatMessageRequest, ChatMessageResponse } from "../../../../api";

type UseChatFrameWebSocketResult = {
  send: (message: ChatMessageRequest) => void;
  receivedMessages: ChatMessageResponse[];
  unreadMessagesNumber: Record<number, number>;
  updateLastReadSyncId: (roomId: number) => void;
};

export default function useChatFrameWebSocket(roomId: number): UseChatFrameWebSocketResult {
  const { websocketUtils } = useGlobalContext();

  const send = useCallback((message: ChatMessageRequest) => {
    websocketUtils.send({ type: 3, data: message });
  }, [websocketUtils]);

  const receivedMessages = useMemo(
    () => websocketUtils.receivedMessages[roomId] ?? [],
    [roomId, websocketUtils.receivedMessages],
  );

  return {
    send,
    receivedMessages,
    unreadMessagesNumber: websocketUtils.unreadMessagesNumber,
    updateLastReadSyncId: websocketUtils.updateLastReadSyncId,
  };
}
