import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { getMobileDirectMessageRepository } from "../../lib/mobile-local-db";
import { filterPersistableDirectMessages } from "./mobileDirectMessageOptimistic";

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
  return repository.getMessagesByUser(currentUserId);
}

export async function readCachedDirectConversationMessages(
  currentUserId: number | null | undefined,
  contactId: number | null | undefined,
): Promise<MessageDirectResponse[]> {
  if (!isPositiveId(currentUserId) || !isPositiveId(contactId)) {
    return [];
  }

  const repository = await getMobileDirectMessageRepository();
  return repository.getMessagesByContact(currentUserId, contactId);
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

export async function markCachedDirectMessagesRecalled(
  currentUserId: number | null | undefined,
  messageIds: number[],
): Promise<void> {
  if (!isPositiveId(currentUserId) || messageIds.length === 0) {
    return;
  }

  const repository = await getMobileDirectMessageRepository();
  await repository.markMessagesRecalled(currentUserId, messageIds);
}

export async function upsertCachedDirectReadLine(
  currentUserId: number | null | undefined,
  contactId: number | null | undefined,
  syncId: number,
): Promise<void> {
  if (!isPositiveId(currentUserId) || !isPositiveId(contactId) || syncId <= 0) {
    return;
  }

  const repository = await getMobileDirectMessageRepository();
  await repository.upsertReadLine(currentUserId, contactId, syncId);
}

export async function clearCachedDirectMessages(currentUserId: number | null | undefined): Promise<void> {
  if (!isPositiveId(currentUserId)) {
    return;
  }

  const repository = await getMobileDirectMessageRepository();
  await repository.clearUserMessages(currentUserId);
}
