import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";

import { buildMessageDraftsFromUploadedMedia } from "./messageDraft";
import { getMessagePreviewText } from "./messagePreview";
import { MESSAGE_TYPE } from "./messageType";

export const DIRECT_MESSAGE_READ_LINE_TYPE = 10000;
export const DIRECT_MESSAGE_RECALL_TYPE = 10001;

export type DirectMessageLocalSyncState = "failed" | "optimistic";
export type OptimisticDirectMessage = MessageDirectResponse & {
  tcLocalSyncState: "optimistic";
};
export type FailedDirectMessage = MessageDirectResponse & {
  tcLocalSyncState: "failed";
};
export type LocalDirectMessage = FailedDirectMessage | OptimisticDirectMessage;

export function isOptimisticDirectMessage(message: MessageDirectResponse): message is OptimisticDirectMessage {
  return (message as Partial<LocalDirectMessage>).tcLocalSyncState === "optimistic";
}

export function isFailedDirectMessage(message: MessageDirectResponse): message is FailedDirectMessage {
  return (message as Partial<LocalDirectMessage>).tcLocalSyncState === "failed";
}

export function isLocalDirectMessage(message: MessageDirectResponse): message is LocalDirectMessage {
  return isOptimisticDirectMessage(message) || isFailedDirectMessage(message);
}

export function markDirectMessageFailed(message: MessageDirectResponse): FailedDirectMessage {
  return {
    ...message,
    tcLocalSyncState: "failed",
  };
}

export function buildDirectMessageRetryRequest(message: MessageDirectResponse): MessageDirectSendRequest | null {
  if (
    typeof message.receiverId !== "number"
    || !Number.isInteger(message.receiverId)
    || message.receiverId <= 0
    || typeof message.messageType !== "number"
    || !Number.isInteger(message.messageType)
  ) {
    return null;
  }

  return {
    receiverId: message.receiverId,
    messageType: message.messageType,
    content: message.content ?? "",
    extra: message.extra ?? {},
    ...(typeof message.replyMessageId === "number" && message.replyMessageId > 0
      ? { replyMessageId: message.replyMessageId }
      : {}),
  };
}

export type DirectMessageLike = Pick<
  MessageDirectResponse,
  | "content"
  | "createTime"
  | "messageId"
  | "messageType"
  | "receiverAvatarFileId"
  | "receiverId"
  | "receiverUsername"
  | "replyMessageId"
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

export function isDirectRecallEvent(message: DirectMessageLike): boolean {
  return message.messageType === DIRECT_MESSAGE_RECALL_TYPE;
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

export function findDirectReplyMessage<T extends Pick<DirectMessageLike, "messageId">>(
  messages: readonly T[],
  replyMessageId: number | null | undefined,
): T | null {
  if (typeof replyMessageId !== "number" || replyMessageId <= 0) {
    return null;
  }
  return messages.find(message => message.messageId === replyMessageId) ?? null;
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

function getDirectMessageStableKeys(message: DirectMessageLike): string[] {
  const keys: string[] = [];
  if (typeof message.messageId === "number" && Number.isFinite(message.messageId)) {
    keys.push(`message:${message.messageId}`);
  }
  if (typeof message.syncId === "number" && Number.isFinite(message.syncId)) {
    keys.push([
      "sync",
      message.senderId ?? "",
      message.receiverId ?? "",
      message.messageType ?? "",
      message.syncId,
    ].join(":"));
  }
  return keys;
}

export function mergeDirectMessages<T extends DirectMessageLike>(
  ...messageLists: Array<readonly T[] | undefined>
): T[] {
  const keyedMessages: Array<T | null> = [];
  const keyToIndex = new Map<string, number>();
  const anonymousMessages: T[] = [];

  for (const list of messageLists) {
    for (const message of list ?? []) {
      const keys = getDirectMessageStableKeys(message);
      if (keys.length === 0) {
        anonymousMessages.push(message);
        continue;
      }

      // 同时按 messageId 和同步键合并，覆盖服务端确认替换本地待确认项的路径。
      const existingIndices = new Set(
        keys.map(key => keyToIndex.get(key)).filter((index): index is number => index !== undefined),
      );
      if (existingIndices.size === 0) {
        const nextIndex = keyedMessages.length;
        keyedMessages.push(message);
        keys.forEach(key => keyToIndex.set(key, nextIndex));
        continue;
      }

      const existingIndex = Math.min(...existingIndices);
      keyedMessages[existingIndex] = message;
      for (const [key, index] of keyToIndex) {
        if (existingIndices.has(index)) {
          keyToIndex.delete(key);
        }
      }
      for (const index of existingIndices) {
        if (index !== existingIndex) {
          keyedMessages[index] = null;
        }
      }
      keys.forEach(key => keyToIndex.set(key, existingIndex));
    }
  }

  return [
    ...keyedMessages.filter((message): message is T => message !== null),
    ...anonymousMessages,
  ].sort(compareDirectMessagesAscending);
}

/**
 * 将 append-only 的私聊事件流投影为当前 UI：撤回事件隐藏自身并标记目标消息。
 * 旧数据没有撤回事件时仍保留服务端既有的 status 字段语义。
 */
export function projectDirectMessageEvents<T extends DirectMessageLike>(events: readonly T[]): T[] {
  const merged = mergeDirectMessages(events);
  const recalledMessageIds = new Set(merged
    .filter(isDirectRecallEvent)
    .map(message => message.replyMessageId)
    .filter((messageId): messageId is number => typeof messageId === "number" && messageId > 0));

  return merged
    .filter(message => !isDirectRecallEvent(message))
    .map((message) => {
      if (!recalledMessageIds.has(message.messageId ?? -1)) {
        return message;
      }
      return { ...message, status: 1 } as T;
    });
}

export function getLatestIncomingSync(
  messages: readonly DirectReadTrackedMessage[],
  contactId: number,
): number {
  return messages.reduce((max, message) => {
    if (message.senderId === contactId && !isDirectReadLineMessage(message) && !isDirectRecallEvent(message)) {
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
    && !isDirectRecallEvent(message)
    && (message.syncId ?? 0) > effectiveReadSync,
  ).length;
}

function isPositiveFileId(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getContactAvatarFileIdFromMessage(message: DirectMessageLike, contactId: number): number | undefined {
  if (message.senderId === contactId && isPositiveFileId(message.senderAvatarFileId)) {
    return message.senderAvatarFileId;
  }
  if (message.receiverId === contactId && isPositiveFileId(message.receiverAvatarFileId)) {
    return message.receiverAvatarFileId;
  }
  return undefined;
}

function getLatestContactAvatarFileId(messages: readonly DirectMessageLike[], contactId: number): number | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const avatarFileId = getContactAvatarFileIdFromMessage(messages[index], contactId);
    if (avatarFileId) {
      return avatarFileId;
    }
  }
  return undefined;
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
      const merged = projectDirectMessageEvents(list);
      const visibleMessages = merged.filter(message => !isDirectReadLineMessage(message));
      if (visibleMessages.length === 0) {
        return null;
      }
      const lastMessage = visibleMessages[visibleMessages.length - 1] ?? merged[merged.length - 1];
      const contactName = lastMessage?.senderId === contactId
        ? (lastMessage.senderUsername ?? `用户 #${contactId}`)
        : (lastMessage?.receiverUsername ?? `用户 #${contactId}`);
      const contactAvatarFileId = getLatestContactAvatarFileId(visibleMessages, contactId);

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
