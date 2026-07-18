import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { DIRECT_MESSAGE_READ_LINE_TYPE, DIRECT_MESSAGE_RECALL_TYPE } from "@tuanchat/domain/direct-message";

type DirectMessageDisplayOrderFields = Pick<
  MessageDirectResponse,
  "createTime" | "messageId" | "messageType" | "syncId"
>;

function getDisplayTime(message: DirectMessageDisplayOrderFields): number {
  const parsedTime = message.createTime ? new Date(message.createTime).getTime() : Number.NaN;
  if (Number.isFinite(parsedTime)) {
    return parsedTime;
  }
  return message.syncId ?? message.messageId ?? 0;
}

export function compareDirectMessagesForDisplay(
  left: DirectMessageDisplayOrderFields,
  right: DirectMessageDisplayOrderFields,
): number {
  const byTime = getDisplayTime(left) - getDisplayTime(right);
  if (byTime !== 0) {
    return byTime;
  }

  const leftSync = left.syncId ?? left.messageId ?? 0;
  const rightSync = right.syncId ?? right.messageId ?? 0;
  return leftSync - rightSync;
}

export function getVisibleDirectMessageTimeline<T extends DirectMessageDisplayOrderFields>(
  messages: readonly T[],
): T[] {
  return messages
    .filter(message => message.messageType !== DIRECT_MESSAGE_READ_LINE_TYPE && message.messageType !== DIRECT_MESSAGE_RECALL_TYPE)
    .sort(compareDirectMessagesForDisplay);
}

export function selectDirectMessagePage<T>(
  messages: readonly T[],
  visibleCount: number,
): T[] {
  const start = Math.max(0, messages.length - visibleCount);
  return messages.slice(start);
}
