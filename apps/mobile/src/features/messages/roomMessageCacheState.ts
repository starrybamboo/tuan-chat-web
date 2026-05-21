import type { RoomMessagesSyncResult } from "./roomMessageSync";
import type { RoomMessagesQueryData } from "./roomMessagesQueryData";

export function shouldResetCachedRoomMessages(
  networkResult: RoomMessagesQueryData,
  queryIsSuccess: boolean,
): boolean {
  return queryIsSuccess
    && !Array.isArray(networkResult)
    && networkResult?.mode === "full"
    && networkResult.messages.length === 0;
}
