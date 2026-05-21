import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import type { RoomMessagesSyncResult } from "./roomMessageSync";

export type RoomMessagesQueryData = ChatMessageResponse[] | RoomMessagesSyncResult | undefined;

function isRoomMessagesSyncResult(value: unknown): value is RoomMessagesSyncResult {
  return Boolean(value)
    && typeof value === "object"
    && Array.isArray((value as RoomMessagesSyncResult).messages);
}

export function extractRoomMessagesFromQueryData(data: RoomMessagesQueryData): ChatMessageResponse[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (isRoomMessagesSyncResult(data)) {
    return data.messages;
  }
  return [];
}

export function updateRoomMessagesQueryData(
  currentData: RoomMessagesQueryData,
  updater: (messages: ChatMessageResponse[] | undefined) => ChatMessageResponse[],
) {
  if (Array.isArray(currentData)) {
    return updater(currentData);
  }
  if (isRoomMessagesSyncResult(currentData)) {
    return {
      ...currentData,
      messages: updater(currentData.messages),
    };
  }
  return updater(undefined);
}
