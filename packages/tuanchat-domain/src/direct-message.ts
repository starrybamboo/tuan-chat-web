import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { buildMessageDraftsFromUploadedMedia } from "./messageDraft";
import { getMessagePreviewText } from "./messagePreview";
import { MESSAGE_TYPE } from "./messageType";

export const DIRECT_MESSAGE_READ_LINE_TYPE = 10000;

export type DirectMessageLike = Pick<
  MessageDirectResponse,
  | "content"
  | "createTime"
  | "messageId"
  | "messageType"
  | "receiverAvatarFileId"
  | "receiverId"
  | "receiverUsername"
  | "senderAvatarFileId"
  | "senderId"
  | "senderUsername"
  | "status"
  | "syncId"
  | "userId"
>;

export type DirectReadTrackedMessage = Pick<DirectMessageLike, "messageType" | "senderId" | "syncId">;

export type DirectConversation<T extends DirectMessageLike = MessageDirectResponse> = {
  contactAvatarFileId: number | undefined;
  contactId: number;
  contactName: string;
  lastMessage: T;
  messages: T[];
  unreadCount: number;
};

export type BuildDirectMessageSendRequestsFromUploadedMediaParams = {
  receiverId: number;
  inputText: string;
  replyMessageId?: number;
  uploadedFiles?: Parameters<typeof buildMessageDraftsFromUploadedMedia>[0]["uploadedFiles"];
  uploadedImages?: Parameters<typeof buildMessageDraftsFromUploadedMedia>[0]["uploadedImages"];
  uploadedSoundMessage?: Parameters<typeof buildMessageDraftsFromUploadedMedia>[0]["uploadedSoundMessage"];
  uploadedVideos?: Parameters<typeof buildMessageDraftsFromUploadedMedia>[0]["uploadedVideos"];
};

function getMessageTime(message: Pick<DirectMessageLike, "createTime" | "messageId" | "syncId">): number {
  const time = message.createTime ? new Date(message.createTime).getTime() : Number.NaN;
  if (Number.isFinite(time)) {
    return time;
  }
  return message.syncId ?? message.messageId ?? 0;
}

export function getDirectContactId(message: DirectMessageLike, currentUserId: number | null | undefined): number | null {
  const senderId = message.senderId;
  const receiverId = message.receiverId;
  if (typeof senderId !== "number" || typeof receiverId !== "number") {
    return null;
  }
  return senderId === currentUserId ? receiverId : senderId;
}

export function compareDirectMessagesAscending(left: DirectMessageLike, right: DirectMessageLike): number {
  const leftSync = left.syncId ?? left.messageId ?? 0;
  const rightSync = right.syncId ?? right.messageId ?? 0;
  if (leftSync !== rightSync) {
    return leftSync - rightSync;
  }
  return getMessageTime(left) - getMessageTime(right);
}

export function compareDirectMessagesDescending(left: DirectMessageLike, right: DirectMessageLike): number {
  return compareDirectMessagesAscending(right, left);
}

export function isDirectReadLineMessage(message: DirectMessageLike): boolean {
  return message.messageType === DIRECT_MESSAGE_READ_LINE_TYPE;
}

export function getDirectMessagePreviewText(message?: MessageDirectResponse | null): string {
  if (!message) {
    return "加载中...";
  }

  if (message.status === 1) {
    return "[消息已撤回]";
  }

  return getMessagePreviewText(message as Message);
}

export function buildDirectMessageSendRequestsFromUploadedMedia({
  inputText,
  receiverId,
  replyMessageId,
  uploadedFiles = [],
  uploadedImages = [],
  uploadedSoundMessage = null,
  uploadedVideos = [],
}: BuildDirectMessageSendRequestsFromUploadedMediaParams): MessageDirectSendRequest[] {
  return buildMessageDraftsFromUploadedMedia({
    inputText,
    uploadedFiles,
    uploadedImages,
    uploadedSoundMessage,
    uploadedVideos,
  }).map((draft) => {
    const messageType = draft.messageType ?? MESSAGE_TYPE.TEXT;
    return {
      receiverId,
      content: draft.content ?? "",
      messageType,
      extra: draft.extra ?? {},
      ...(typeof replyMessageId === "number" && replyMessageId > 0 ? { replyMessageId } : {}),
    };
  });
}

export function mergeDirectMessages<T extends DirectMessageLike>(
  ...messageLists: Array<readonly T[] | undefined>
): T[] {
  const byId = new Map<number, T>();
  const anonymousMessages: T[] = [];

  for (const list of messageLists) {
    for (const message of list ?? []) {
      if (typeof message.messageId === "number" && Number.isFinite(message.messageId)) {
        byId.set(message.messageId, message);
      } else {
        anonymousMessages.push(message);
      }
    }
  }

  return [...byId.values(), ...anonymousMessages].sort(compareDirectMessagesAscending);
}

export function getLatestIncomingSync(
  messages: readonly DirectReadTrackedMessage[],
  contactId: number,
): number {
  return messages.reduce((max, message) => {
    if (message.senderId === contactId && !isDirectReadLineMessage(message)) {
      return Math.max(max, message.syncId ?? 0);
    }
    return max;
  }, 0);
}

export function getDirectUnreadCount(
  messages: readonly DirectReadTrackedMessage[],
  contactId: number,
  currentUserId: number,
  optimisticReadSync = 0,
): number {
  const readLineSync = messages.reduce((max, message) => {
    if (isDirectReadLineMessage(message) && message.senderId === currentUserId) {
      return Math.max(max, message.syncId ?? 0);
    }
    return max;
  }, 0);
  const effectiveReadSync = Math.max(readLineSync, optimisticReadSync);

  return messages.filter(message =>
    message.senderId === contactId
    && !isDirectReadLineMessage(message)
    && (message.syncId ?? 0) > effectiveReadSync,
  ).length;
}

export function groupDirectConversations<T extends DirectMessageLike>(
  messages: readonly T[],
  currentUserId: number | null | undefined,
  optimisticReadSyncByContact: Record<number, number> = {},
): DirectConversation<T>[] {
  const grouped = new Map<number, T[]>();

  for (const message of messages) {
    const contactId = getDirectContactId(message, currentUserId);
    if (!contactId || contactId === currentUserId) {
      continue;
    }
    const list = grouped.get(contactId) ?? [];
    list.push(message);
    grouped.set(contactId, list);
  }

  return Array.from(grouped.entries())
    .map(([contactId, list]) => {
      const merged = mergeDirectMessages(list);
      const visibleMessages = merged.filter(message => !isDirectReadLineMessage(message));
      if (visibleMessages.length === 0) {
        return null;
      }
      const lastMessage = visibleMessages[visibleMessages.length - 1] ?? merged[merged.length - 1];
      const contactName = lastMessage?.senderId === contactId
        ? (lastMessage.senderUsername ?? `用户 #${contactId}`)
        : (lastMessage?.receiverUsername ?? `用户 #${contactId}`);
      const contactAvatarFileId = lastMessage?.senderId === contactId
        ? lastMessage.senderAvatarFileId
        : lastMessage?.receiverAvatarFileId;

      return {
        contactAvatarFileId,
        contactId,
        contactName,
        lastMessage,
        messages: merged,
        unreadCount: typeof currentUserId === "number"
          ? getDirectUnreadCount(merged, contactId, currentUserId, optimisticReadSyncByContact[contactId] ?? 0)
          : 0,
      };
    })
    .filter((conversation): conversation is DirectConversation<T> => Boolean(conversation?.lastMessage))
    .sort((left, right) => compareDirectMessagesDescending(left.lastMessage, right.lastMessage));
}
