import type { InfiniteData } from "@tanstack/react-query";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import type { ApiResultCursorPageBaseResponseChatMessageResponse } from "@tuanchat/openapi-client/models/ApiResultCursorPageBaseResponseChatMessageResponse";
import type { ChatMessagePageRequest } from "@tuanchat/openapi-client/models/ChatMessagePageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { getDiceResultExtra, getDiceTurnExtra } from "@tuanchat/domain/message-extra";

export type RoomMessagesInfiniteQueryData = InfiniteData<
  ApiResultCursorPageBaseResponseChatMessageResponse,
  ChatMessagePageRequest
>;

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseTimeToMs(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const normalized = value.includes("-") ? value.replace(/-/g, "/") : value;
  const parsed = new Date(normalized).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function compareOptionalNumber(left: number | undefined, right: number | undefined): number | null {
  if (left !== undefined && right !== undefined && left !== right) {
    return left - right;
  }
  if (left !== undefined && right === undefined) {
    return -1;
  }
  if (left === undefined && right !== undefined) {
    return 1;
  }
  return null;
}

export function compareMessagesByOrder(left: Message, right: Message): number {
  const positionCompare = compareOptionalNumber(toFiniteNumber(left.position), toFiniteNumber(right.position));
  if (positionCompare !== null) {
    return positionCompare;
  }

  const syncCompare = compareOptionalNumber(toFiniteNumber(left.syncId), toFiniteNumber(right.syncId));
  if (syncCompare !== null) {
    return syncCompare;
  }

  const idCompare = compareOptionalNumber(toFiniteNumber(left.messageId), toFiniteNumber(right.messageId));
  if (idCompare !== null) {
    return idCompare;
  }

  const timeCompare = compareOptionalNumber(parseTimeToMs(left.createTime), parseTimeToMs(right.createTime));
  if (timeCompare !== null) {
    return timeCompare;
  }

  return JSON.stringify({
    content: left.content ?? "",
    messageType: left.messageType ?? 0,
    roleId: left.roleId ?? 0,
    userId: left.userId ?? 0,
    replayMessageId: left.replyMessageId ?? 0,
  }).localeCompare(JSON.stringify({
    content: right.content ?? "",
    messageType: right.messageType ?? 0,
    roleId: right.roleId ?? 0,
    userId: right.userId ?? 0,
    replayMessageId: right.replyMessageId ?? 0,
  }));
}

function compareRoomMessages(left: ChatMessageResponse, right: ChatMessageResponse) {
  return compareMessagesByOrder(left.message, right.message);
}

function getMessageId(item: ChatMessageResponse): number | null {
  const messageId = item?.message?.messageId;
  return typeof messageId === "number" && Number.isFinite(messageId) ? messageId : null;
}

export function mergeRoomMessages(
  ...messageLists: Array<ChatMessageResponse[] | undefined>
): ChatMessageResponse[] {
  const messageMap = new Map<number, ChatMessageResponse>();

  messageLists.forEach((messageList) => {
    messageList?.forEach((item) => {
      const messageId = getMessageId(item);
      if (messageId !== null) {
        // 删除态一旦出现，就不要再被后续的未删除快照覆盖回去。
        const existing = messageMap.get(messageId);
        if (existing?.message?.status === 1) {
          return;
        }
        messageMap.set(messageId, item);
      }
    });
  });

  return Array.from(messageMap.values()).sort(compareRoomMessages);
}

export function upsertRoomMessagesListData(
  currentMessages: ChatMessageResponse[] | undefined,
  incomingMessages: ChatMessageResponse[],
): ChatMessageResponse[] {
  return mergeRoomMessages(currentMessages, incomingMessages);
}

export function replaceRoomMessageListData(
  currentMessages: ChatMessageResponse[] | undefined,
  messageId: number,
  nextMessage: ChatMessageResponse,
): ChatMessageResponse[] {
  return mergeRoomMessages((currentMessages ?? []).map((item) => {
    return getMessageId(item) === messageId ? nextMessage : item;
  }));
}

export function markRoomMessageDeletedData(
  currentMessages: ChatMessageResponse[] | undefined,
  messageId: number,
): ChatMessageResponse[] {
  return mergeRoomMessages((currentMessages ?? []).map((item) => {
    if (getMessageId(item) !== messageId) {
      return item;
    }
    return {
      ...item,
      message: {
        ...item.message,
        status: 1,
      },
    };
  }));
}

export function markRoomMessagesDeleted(
  currentMessages: ChatMessageResponse[] | undefined,
  messageIds: number | number[],
): ChatMessageResponse[] {
  const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
  return ids.reduce(
    (messages, messageId) => markRoomMessageDeletedData(messages, messageId),
    currentMessages ?? [],
  );
}

export type RoomMessageVisibilityContext = {
  currentUserId?: number | null;
  hasHostPrivileges?: boolean;
};

export function isHiddenDiceMessage(message?: Message | null): boolean {
  if (getDiceTurnExtra(message?.extra)) {
    return false;
  }
  return message?.messageType === MESSAGE_TYPE.DICE && getDiceResultExtra(message.extra)?.hidden === true;
}

export function canViewRoomMessage(message: Message | undefined, context: RoomMessageVisibilityContext): boolean {
  if (!message) {
    return false;
  }
  if (message.status === 1) {
    return true;
  }
  if (!isHiddenDiceMessage(message)) {
    return true;
  }
  if (typeof context.currentUserId === "number" && context.currentUserId > 0 && message.userId === context.currentUserId) {
    return true;
  }
  return context.hasHostPrivileges === true;
}

export function selectVisibleMainRoomMessages(
  messages: ChatMessageResponse[],
  context: RoomMessageVisibilityContext,
): ChatMessageResponse[] {
  return messages.filter(item => canViewRoomMessage(item.message, context));
}

export function getMaxRoomMessageSyncId(messages: readonly ChatMessageResponse[] | undefined): number {
  return (messages ?? []).reduce((max, item) => {
    const syncId = toFiniteNumber(item.message?.syncId);
    return syncId == null ? max : Math.max(max, syncId);
  }, 0);
}

export function getRoomMessageSyncGapStart(
  currentMessages: readonly ChatMessageResponse[] | undefined,
  incomingMessage: ChatMessageResponse | undefined,
): number | null {
  const incomingSyncId = toFiniteNumber(incomingMessage?.message?.syncId);
  if (incomingSyncId == null || incomingSyncId <= 0) {
    return null;
  }
  const incomingMessageId = toFiniteNumber(incomingMessage?.message?.messageId);
  const knownMessageIds = new Set(
    (currentMessages ?? [])
      .map(item => toFiniteNumber(item.message?.messageId))
      .filter((messageId): messageId is number => messageId != null),
  );
  if (incomingMessageId != null && knownMessageIds.has(incomingMessageId)) {
    return null;
  }
  const maxKnownSyncId = getMaxRoomMessageSyncId(currentMessages);
  return incomingSyncId > maxKnownSyncId + 1 ? maxKnownSyncId + 1 : null;
}

export function flattenRoomMessagePages(
  pages: Array<{ data?: { list?: ChatMessageResponse[] } }> | undefined,
): ChatMessageResponse[] {
  if (!pages || pages.length === 0) {
    return [];
  }

  return mergeRoomMessages(...pages.map(page => page.data?.list));
}

export function upsertRoomMessagesInfiniteData(
  currentData: RoomMessagesInfiniteQueryData | undefined,
  roomId: number,
  incomingMessages: ChatMessageResponse[],
  pageSize: number = 20,
): RoomMessagesInfiniteQueryData {
  const nextIncomingMessages = mergeRoomMessages(incomingMessages);
  if (nextIncomingMessages.length === 0) {
    return currentData ?? {
      pageParams: [{
        roomId,
        pageSize,
      }],
      pages: [{
        success: true,
        data: {
          isLast: true,
          list: [],
        },
      }],
    };
  }

  if (!currentData || currentData.pages.length === 0) {
    return {
      pageParams: [{
        roomId,
        pageSize,
      }],
      pages: [{
        success: true,
        data: {
          isLast: true,
          list: nextIncomingMessages,
        },
      }],
    };
  }

  const [firstPage, ...restPages] = currentData.pages;
  const mergedFirstPageMessages = mergeRoomMessages(firstPage.data?.list, nextIncomingMessages);

  return {
    pageParams: currentData.pageParams.length > 0
      ? currentData.pageParams
      : [{
          roomId,
          pageSize,
        }],
    pages: [{
      ...firstPage,
      data: {
        ...firstPage.data,
        list: mergedFirstPageMessages,
      },
    }, ...restPages],
  };
}
