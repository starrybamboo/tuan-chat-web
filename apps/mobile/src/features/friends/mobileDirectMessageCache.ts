import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { getMobileDirectMessageRepository } from "../../lib/mobile-local-db";
import { filterPersistableDirectMessages } from "./mobileDirectMessageOptimistic";

const DIRECT_INBOX_CACHE_WINDOW_SIZE = 240;
const DIRECT_CONVERSATION_CACHE_WINDOW_SIZE = 120;

function isPositiveId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export async function readCachedDirectInboxMessages(
  currentUserId: number | null | undefined,
): Promise<MessageDirectResponse[]> {
  if (!isPositiveId(currentUserId)) {
    return [];
  }

  const repository = await getMobileDirectMessageRepository();
  return repository.getMessagesByUser(currentUserId, { limit: DIRECT_INBOX_CACHE_WINDOW_SIZE });
}

export async function readCachedDirectConversationMessages(
  currentUserId: number | null | undefined,
  contactId: number | null | undefined,
): Promise<MessageDirectResponse[]> {
  if (!isPositiveId(currentUserId) || !isPositiveId(contactId)) {
    return [];
  }

  const repository = await getMobileDirectMessageRepository();
  return repository.getMessagesByContact(currentUserId, contactId, { limit: DIRECT_CONVERSATION_CACHE_WINDOW_SIZE });
}

export async function getCachedDirectConversationMaxSyncId(
  currentUserId: number | null | undefined,
  contactId: number | null | undefined,
): Promise<number> {
  if (!isPositiveId(currentUserId) || !isPositiveId(contactId)) {
    return 0;
  }
  const repository = await getMobileDirectMessageRepository();
  return repository.getMaxSyncIdByContact(currentUserId, contactId);
}

export async function writeCachedDirectMessages(
  currentUserId: number | null | undefined,
  messages: MessageDirectResponse[],
): Promise<void> {
  const persistableMessages = filterPersistableDirectMessages(messages);
  if (!isPositiveId(currentUserId) || persistableMessages.length === 0) {
    return;
  }

  const repository = await getMobileDirectMessageRepository();
  await repository.upsertMessages(currentUserId, persistableMessages);
}

export async function writePendingDirectMessage(
  currentUserId: number | null | undefined,
  message: MessageDirectResponse,
): Promise<void> {
  if (!isPositiveId(currentUserId)) {
    return;
  }
  const repository = await getMobileDirectMessageRepository();
  await repository.addPendingMessage(currentUserId, message);
}

export async function promotePendingDirectMessage(
  currentUserId: number | null | undefined,
  pendingMessageId: number,
  confirmedMessage: MessageDirectResponse,
): Promise<void> {
  if (!isPositiveId(currentUserId)) {
    return;
  }
  const repository = await getMobileDirectMessageRepository();
  await repository.promotePendingMessage(currentUserId, pendingMessageId, confirmedMessage);
}

export async function rollbackPendingDirectMessage(
  currentUserId: number | null | undefined,
  pendingMessageId: number,
): Promise<void> {
  if (!isPositiveId(currentUserId)) {
    return;
  }
  const repository = await getMobileDirectMessageRepository();
  await repository.rollbackPendingMessage(currentUserId, pendingMessageId);
}

export async function clearCachedDirectMessages(currentUserId: number | null | undefined): Promise<void> {
  if (!isPositiveId(currentUserId)) {
    return;
  }

  const repository = await getMobileDirectMessageRepository();
  await repository.clearUserMessages(currentUserId);
}
