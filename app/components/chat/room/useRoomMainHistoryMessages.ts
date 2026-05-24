import { useMemo } from "react";

import type { ChatMessageResponse } from "../../../../api";

type UseRoomMainHistoryMessagesParams = {
  historyMessages?: ChatMessageResponse[];
};

export default function useRoomMainHistoryMessages({
  historyMessages,
}: UseRoomMainHistoryMessagesParams): ChatMessageResponse[] {
  return useMemo(() => {
    return historyMessages ?? [];
  }, [historyMessages]);
}
