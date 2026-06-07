import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import type { RoomMessagesQueryData } from "./roomMessagesQueryData";
import type { RoomMessagesSyncResult } from "./roomMessageSync";

function isRoomMessagesSyncResult(value: RoomMessagesQueryData): value is RoomMessagesSyncResult {
  const mode = (value as RoomMessagesSyncResult | null | undefined)?.mode;
  return Boolean(value)
    && !Array.isArray(value)
    && typeof value === "object"
    && Array.isArray((value as RoomMessagesSyncResult).messages)
    && (mode === "full" || mode === "delta");
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

export function getFetchedRoomMessagesToPersist(
  networkResult: RoomMessagesQueryData,
  queryIsSuccess: boolean,
): ChatMessageResponse[] {
  if (!queryIsSuccess || !isRoomMessagesSyncResult(networkResult)) {
    return [];
  }
  return networkResult.messages;
}
