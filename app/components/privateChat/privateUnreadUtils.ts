import type { MessageDirectType } from "./types/messageDirect";

type ReadTrackedMessage = Pick<MessageDirectType, "messageType" | "senderId" | "syncId">;

export function getLatestIncomingSync(
  messages: readonly ReadTrackedMessage[],
  contactId: number,
): number {
  return messages.reduce((max, msg) => {
    if (msg?.senderId === contactId && msg?.messageType !== 10000) {
      return Math.max(max, msg?.syncId ?? 0);
    }
    return max;
  }, 0);
}

export function getUnreadMessageCountForMessages(
  messages: readonly ReadTrackedMessage[],
  contactId: number,
  userId: number,
  optimisticReadSync: number,
): number {
  const readLineSync = messages.reduce((max, msg) => {
    if (msg?.messageType === 10000 && msg?.senderId === userId) {
      return Math.max(max, msg?.syncId ?? 0);
    }
    return max;
  }, 0);

  const latestIncomingSync = getLatestIncomingSync(messages, contactId);
  const effectiveReadLineSync = Math.max(readLineSync, optimisticReadSync);

  if (latestIncomingSync <= effectiveReadLineSync) {
    return 0;
  }

  return messages.filter((msg) => {
    return msg?.senderId === contactId
      && msg?.messageType !== 10000
      && (msg?.syncId ?? 0) > effectiveReadLineSync;
  }).length;
}
