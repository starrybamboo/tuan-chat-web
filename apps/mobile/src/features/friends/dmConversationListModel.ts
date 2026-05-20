import {
  compareDirectMessagesDescending,
  isDirectReadLineMessage,
  mergeDirectMessages,
} from "@tuanchat/domain/direct-message";

import type { DmConversation } from "./useDmInboxQuery";

function getLatestVisibleMessage(conversation: DmConversation) {
  return conversation.messages.filter(message => !isDirectReadLineMessage(message)).at(-1) ?? conversation.lastMessage;
}

function mergeConversation(left: DmConversation, right: DmConversation): DmConversation {
  const messages = mergeDirectMessages(left.messages, right.messages);
  const newestSource = compareDirectMessagesDescending(left.lastMessage, right.lastMessage) < 0 ? left : right;
  const lastMessage = messages.filter(message => !isDirectReadLineMessage(message)).at(-1) ?? newestSource.lastMessage;

  return {
    contactAvatarFileId: newestSource.contactAvatarFileId,
    contactId: left.contactId,
    contactName: newestSource.contactName,
    lastMessage,
    messages,
    unreadCount: Math.max(left.unreadCount, right.unreadCount),
  };
}

export function sortDmConversations(conversations: readonly DmConversation[]): DmConversation[] {
  return [...conversations].sort((left, right) => {
    const byLastMessage = compareDirectMessagesDescending(getLatestVisibleMessage(left), getLatestVisibleMessage(right));
    if (byLastMessage !== 0) {
      return byLastMessage;
    }
    return left.contactId - right.contactId;
  });
}

export function normalizeDmConversations(conversations: readonly DmConversation[]): DmConversation[] {
  const byContactId = new Map<number, DmConversation>();

  for (const conversation of conversations) {
    const existing = byContactId.get(conversation.contactId);
    byContactId.set(
      conversation.contactId,
      existing ? mergeConversation(existing, conversation) : conversation,
    );
  }

  return sortDmConversations([...byContactId.values()]);
}
