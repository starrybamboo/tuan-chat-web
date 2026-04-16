import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { mergeRoomMessages } from "@tuanchat/query/chat";

export const MOBILE_ROOM_MESSAGE_CACHE_LIMIT = 80;

export type StoredRoomMessageCache = {
  messages: ChatMessageResponse[];
  roomId: number;
  updatedAt: string;
};

const EMPTY_CACHE_TIMESTAMP = "1970-01-01T00:00:00.000Z";

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeCacheLimit(limit: number): number {
  return Number.isInteger(limit) && limit > 0 ? limit : MOBILE_ROOM_MESSAGE_CACHE_LIMIT;
}

export function limitStoredRoomMessages(
  messages: ChatMessageResponse[],
  limit: number = MOBILE_ROOM_MESSAGE_CACHE_LIMIT,
): ChatMessageResponse[] {
  const mergedMessages = mergeRoomMessages(messages);
  const resolvedLimit = normalizeCacheLimit(limit);
  return mergedMessages.slice(Math.max(mergedMessages.length - resolvedLimit, 0));
}

export function sanitizeStoredRoomMessageCache(
  input: unknown,
  limit: number = MOBILE_ROOM_MESSAGE_CACHE_LIMIT,
): StoredRoomMessageCache | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const roomId = isPositiveInteger((input as { roomId?: unknown }).roomId)
    ? (input as { roomId: number }).roomId
    : null;
  if (!roomId) {
    return null;
  }

  const messages = Array.isArray((input as { messages?: unknown[] }).messages)
    ? limitStoredRoomMessages((input as { messages: ChatMessageResponse[] }).messages, limit)
    : [];
  const updatedAt = typeof (input as { updatedAt?: unknown }).updatedAt === "string"
    ? (input as { updatedAt: string }).updatedAt.trim()
    : "";

  return {
    messages,
    roomId,
    updatedAt: updatedAt || EMPTY_CACHE_TIMESTAMP,
  };
}

export function buildStoredRoomMessageCache(
  roomId: number,
  messages: ChatMessageResponse[],
  limit: number = MOBILE_ROOM_MESSAGE_CACHE_LIMIT,
): StoredRoomMessageCache | null {
  if (!isPositiveInteger(roomId)) {
    return null;
  }

  return {
    messages: limitStoredRoomMessages(messages, limit),
    roomId,
    updatedAt: new Date().toISOString(),
  };
}
