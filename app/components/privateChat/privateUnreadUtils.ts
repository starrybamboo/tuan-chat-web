import type { MessageDirectType } from "./types/messageDirect";

import {
  getDirectUnreadCount,
  getLatestIncomingSync as getSharedLatestIncomingSync,
} from "@tuanchat/domain/direct-message";

type ReadTrackedMessage = Pick<MessageDirectType, "messageType" | "senderId" | "syncId">;

export function getLatestIncomingSync(
  messages: readonly ReadTrackedMessage[],
  contactId: number,
): number {
  return getSharedLatestIncomingSync(messages, contactId);
}

export function getUnreadMessageCountForMessages(
  messages: readonly ReadTrackedMessage[],
  contactId: number,
  userId: number,
  optimisticReadSync: number,
): number {
  return getDirectUnreadCount(messages, contactId, userId, optimisticReadSync);
}
