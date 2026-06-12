import type { Message } from "@tuanchat/openapi-client/models/Message";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { getRoomMessageLocalRenderKey } from "@tuanchat/query/room-message-lifecycle";

export type ChatMessageListItem = {
  message: Message;
};

export function isVisibleRoomMessage(message: Message): boolean {
  return message.status !== 1 && message.messageType !== MESSAGE_TYPE.EFFECT;
}

export function getVisibleMessageItems(messages: readonly ChatMessageListItem[]): ChatMessageListItem[] {
  return messages.filter(item => isVisibleRoomMessage(item.message));
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
