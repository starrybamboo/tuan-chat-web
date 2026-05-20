import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { getMobileRoomMessageRepository } from "../../lib/mobile-local-db";

function isPositiveRoomId(roomId: number): boolean {
  return Number.isInteger(roomId) && roomId > 0;
}

export async function readCachedRoomMessages(roomId: number): Promise<ChatMessageResponse[]> {
  if (!isPositiveRoomId(roomId)) {
    return [];
  }

  const repository = await getMobileRoomMessageRepository();
  const messages = await repository.getMessagesByRoomId(roomId);
  return messages.filter(m => typeof m.message?.messageId === "number" && m.message.messageId > 0);
}

export async function readCachedRoomMessagesSinceSyncId(roomId: number, syncId: number): Promise<ChatMessageResponse[]> {
  if (!isPositiveRoomId(roomId)) {
    return [];
  }

  const repository = await getMobileRoomMessageRepository();
  return repository.getMessagesSinceSyncId(roomId, syncId);
}

export async function getCachedRoomMessagesMaxSyncId(roomId: number): Promise<number> {
  if (!isPositiveRoomId(roomId)) {
    return -1;
  }

  const repository = await getMobileRoomMessageRepository();
  return repository.getMaxSyncId(roomId);
}

export async function writeCachedRoomMessages(roomId: number, messages: ChatMessageResponse[]) {
  if (!isPositiveRoomId(roomId)) {
    return;
  }

  const repository = await getMobileRoomMessageRepository();
  await repository.upsertMessages(
    messages.filter(message =>
      message.message?.roomId === roomId
      && typeof message.message?.messageId === "number"
      && message.message.messageId > 0,
    ),
  );
}

export async function markCachedRoomMessagesDeleted(roomId: number, messageIds: number[]) {
  if (!isPositiveRoomId(roomId)) {
    return;
  }

  const repository = await getMobileRoomMessageRepository();
  await repository.markMessagesDeleted(messageIds);
}

export async function clearCachedRoomMessages(roomId: number) {
  if (!isPositiveRoomId(roomId)) {
    return;
  }

  const repository = await getMobileRoomMessageRepository();
  await repository.clearRoomMessages(roomId);
}
