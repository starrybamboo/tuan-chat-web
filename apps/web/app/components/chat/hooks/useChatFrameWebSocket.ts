import { useCallback } from "react";

import { useGlobalWebSocket } from "@/components/globalContextProvider";

import type { ChatMessageRequest } from "../../../../api";

type UseChatFrameWebSocketResult = {
  send: (message: ChatMessageRequest) => void;
  unreadMessagesNumber: Record<number, number>;
  updateLastReadSyncId: (roomId: number, lastReadSyncId?: number) => void;
};

export default function useChatFrameWebSocket(_roomId: number): UseChatFrameWebSocketResult {
  const websocketUtils = useGlobalWebSocket();

  const send = useCallback((message: ChatMessageRequest) => {
    websocketUtils.send({ type: 3, data: message });
  }, [websocketUtils]);

  return {
    send,
    unreadMessagesNumber: websocketUtils.unreadMessagesNumber,
    updateLastReadSyncId: websocketUtils.updateLastReadSyncId,
  };
}
