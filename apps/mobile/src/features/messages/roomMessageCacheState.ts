import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { mergeRoomMessagesForLocalState } from "@tuanchat/query/room-message-lifecycle";

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

export function shouldHydrateRoomMessagesFromDisk(
  queryStatus: string | undefined,
  cachedMessages: readonly ChatMessageResponse[],
): boolean {
  return queryStatus !== "success" && cachedMessages.length > 0;
}

function isCacheableRoomMessage(roomId: number, message: ChatMessageResponse): boolean {
  return message.message?.roomId === roomId
    && typeof message.message?.messageId === "number"
    && message.message.messageId > 0;
}

export function mergeRoomMessagesForQueryCache(params: {
  cachedMessages: ChatMessageResponse[];
  currentMessages: ChatMessageResponse[];
  fetchedMessages: ChatMessageResponse[];
  roomId: number,
}): ChatMessageResponse[] {
  const cacheableCachedMessages = params.cachedMessages.filter(message => isCacheableRoomMessage(params.roomId, message));
  const cacheableFetchedMessages = params.fetchedMessages.filter(message => isCacheableRoomMessage(params.roomId, message));
  const cachedAndCurrentMessages = mergeRoomMessagesForLocalState(
    cacheableCachedMessages,
    params.currentMessages,
  );
  return mergeRoomMessagesForLocalState(cachedAndCurrentMessages, cacheableFetchedMessages);
}
