import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

/** Distinguishes a full room refresh from an incremental sync result. */
export type RoomMessagesFetchMode = "full" | "delta";

/** Cached shape used by the mobile room message query when local sync is enabled. */
export type RoomMessagesSyncResult = {
  messages: ChatMessageResponse[];
  mode: RoomMessagesFetchMode;
};

/** Supported room message query payloads across mobile cache and plain list consumers. */
export type RoomMessagesQueryData = ChatMessageResponse[] | RoomMessagesSyncResult | undefined;

function isRoomMessagesSyncResult(value: unknown): value is RoomMessagesSyncResult {
  return Boolean(value)
    && typeof value === "object"
    && Array.isArray((value as RoomMessagesSyncResult).messages);
}

/** Normalizes supported room message query payloads into a plain message array. */
export function extractRoomMessagesFromQueryData(data: RoomMessagesQueryData): ChatMessageResponse[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (isRoomMessagesSyncResult(data)) {
    return data.messages;
  }
  return [];
}

/** Applies a message-list updater while preserving the existing query data wrapper shape. */
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
