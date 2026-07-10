import type { Message } from "@tuanchat/openapi-client/models/Message";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { getRoomMessageLocalRenderKey } from "@tuanchat/query/room-message-lifecycle";

export type ChatMessageListItem = {
  message: Message;
};

export type ChatMessageListModel = {
  invertedData: ChatMessageListItem[];
  messageMap: Map<number, Message>;
  visibleChatMessages: Message[];
  visibleMessages: ChatMessageListItem[];
};

export function isVisibleRoomMessage(message: Message): boolean {
  return message.status !== 1
    && message.messageType !== MESSAGE_TYPE.EFFECT
    && message.messageType !== MESSAGE_TYPE.STATE_EVENT;
}

export function getVisibleMessageItems(messages: readonly ChatMessageListItem[]): ChatMessageListItem[] {
  return messages.filter(item => isVisibleRoomMessage(item.message));
}

export function buildChatMessageListModel(
  messages: readonly ChatMessageListItem[],
): ChatMessageListModel {
  const visibleMessages: ChatMessageListItem[] = [];
  const messageMap = new Map<number, Message>();

  for (const item of messages) {
    const { message } = item;
    if (!isVisibleRoomMessage(message)) {
      continue;
    }

    visibleMessages.push(item);
    if (typeof message.messageId === "number") {
      messageMap.set(message.messageId, message);
    }
  }

  const visibleChatMessages = visibleMessages.map(item => item.message);

  return {
    invertedData: [...visibleMessages].reverse(),
    messageMap,
    visibleChatMessages,
    visibleMessages,
  };
}

export function getMessageListItemKey(message: Message, index: number): string {
  const localRenderKey = getRoomMessageLocalRenderKey(message);
  if (localRenderKey) {
    return localRenderKey;
  }
  if (typeof message.messageId === "number" && Number.isFinite(message.messageId)) {
    return `message:${message.messageId}`;
  }
  if (typeof message.syncId === "number" && Number.isFinite(message.syncId)) {
    return `sync:${message.syncId}`;
  }
  const fallbackParts = [
    message.roomId,
    message.position,
    message.createTime,
    message.userId,
    message.roleId,
    message.messageType,
    message.content?.slice(0, 24),
    index,
  ];
  return `fallback:${fallbackParts.map(value => value ?? "").join(":")}`;
}

export function getVisibleMessageListSignature(messages: readonly ChatMessageListItem[]): string {
  return messages.map((item, index) => {
    const { message } = item;
    const identity = getRoomMessageLocalRenderKey(message)
      ?? (typeof message.messageId === "number" && Number.isFinite(message.messageId)
        ? `message:${message.messageId}`
        : typeof message.syncId === "number" && Number.isFinite(message.syncId)
          ? `sync:${message.syncId}`
          : `index:${index}`);
    return [
      identity,
      message.messageId ?? "",
      message.syncId ?? "",
      message.status ?? "",
      message.position ?? "",
      message.updateTime ?? "",
    ].join(",");
  }).join("|");
}

export function buildVisibleMessageMap(messages: readonly ChatMessageListItem[]): Map<number, Message> {
  const map = new Map<number, Message>();
  for (const item of messages) {
    if (typeof item.message.messageId === "number" && isVisibleRoomMessage(item.message)) {
      map.set(item.message.messageId, item.message);
    }
  }
  return map;
}

export function getReplyPreviewText(messageMap: ReadonlyMap<number, Message>, replyMessageId?: number | null): string | null {
  if (typeof replyMessageId !== "number") {
    return null;
  }
  const replyMessage = messageMap.get(replyMessageId);
  return replyMessage?.content?.trim().slice(0, 60) ?? null;
}
