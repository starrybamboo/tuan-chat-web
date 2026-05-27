import type { RoomMessagesQueryData } from "./roomMessagesQueryData";
import type { RoomMessagesSyncResult } from "./roomMessageSync";

function isRoomMessagesSyncResult(value: RoomMessagesQueryData): value is RoomMessagesSyncResult {
  return Boolean(value)
    && !Array.isArray(value)
    && typeof value === "object"
    && Array.isArray((value as RoomMessagesSyncResult).messages)
    && typeof (value as RoomMessagesSyncResult).mode === "string";
}

export function shouldResetCachedRoomMessages(
  networkResult: RoomMessagesQueryData,
  queryIsSuccess: boolean,
): boolean {
  return queryIsSuccess
    && isRoomMessagesSyncResult(networkResult)
    && networkResult.mode === "full"
    && networkResult.messages.length === 0;
}
