import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

export type RoomMessagesFetchMode = "full" | "delta";

export type RoomMessagesSyncResult = {
  messages: ChatMessageResponse[];
  mode: RoomMessagesFetchMode;
};

export type RoomMessagesQueryData
  = | ChatMessageResponse[]
    | RoomMessagesSyncResult
    | undefined;

/** 当前房间消息热态/渲染投影 key；完整历史仍由各端本地消息库承载。 */
export function getRoomMessagesQueryKey(roomId: number): readonly ["getHistoryMessages", number, 0] {
  return ["getHistoryMessages", roomId, 0] as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isMessage(value: unknown): value is Message {
  return isRecord(value)
    && typeof value.messageId === "number"
    && typeof value.roomId === "number"
    && typeof value.content === "string";
}

function isChatMessageResponse(value: unknown): value is ChatMessageResponse {
  return isRecord(value) && isMessage(value.message);
}

function isRoomMessagesSyncResult(value: unknown): value is RoomMessagesSyncResult {
  return isRecord(value)
    && Array.isArray((value as { messages?: unknown }).messages)
    && typeof (value as { mode?: unknown }).mode === "string";
}

function extractRoomMessages(value: unknown): ChatMessageResponse[] {
  const rawList = Array.isArray(value)
    ? value
    : isRoomMessagesSyncResult(value)
      ? value.messages
      : [];

  return rawList.flatMap((item): ChatMessageResponse[] => {
    if (isChatMessageResponse(item)) {
      return [{ message: item.message }];
    }
    if (isMessage(item)) {
      return [{ message: item }];
    }
    return [];
  });
}

export function extractRoomMessagesFromQueryData(currentData: RoomMessagesQueryData): ChatMessageResponse[] {
  return extractRoomMessages(currentData);
}

export function updateRoomMessagesQueryData(
  currentData: RoomMessagesQueryData,
  updater: (messages: ChatMessageResponse[]) => ChatMessageResponse[],
): RoomMessagesQueryData {
  const nextMessages = updater(extractRoomMessages(currentData));

  if (Array.isArray(currentData)) {
    return nextMessages;
  }
  if (isRoomMessagesSyncResult(currentData)) {
    // Sync results are raw queryFn payloads; manual cache merges are no longer fetch deltas.
    return nextMessages;
  }
  return nextMessages;
}
