import type { ChatMessageResponse, Message } from "../../../../api";

type MessageOrderComparable = {
  position?: unknown;
  syncId?: unknown;
  messageId?: unknown;
  createTime?: unknown;
  content?: unknown;
  messageType?: unknown;
  roleId?: unknown;
  userId?: unknown;
  replyMessageId?: unknown;
};

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
  if (value == null) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const raw = value.trim();
  if (!raw) {
    return undefined;
  }
  const normalized = raw.includes("-") ? raw.replace(/-/g, "/") : raw;
  const parsed = new Date(normalized).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

export function compareMessageOrder(left: MessageOrderComparable, right: MessageOrderComparable): number {
  const leftPosition = toFiniteNumber(left.position);
  const rightPosition = toFiniteNumber(right.position);
  if (leftPosition !== undefined && rightPosition !== undefined && leftPosition !== rightPosition) {
    return leftPosition - rightPosition;
  }
  if (leftPosition !== undefined && rightPosition === undefined) {
    return -1;
  }
  if (leftPosition === undefined && rightPosition !== undefined) {
    return 1;
  }

  const leftSyncId = toFiniteNumber(left.syncId);
  const rightSyncId = toFiniteNumber(right.syncId);
  if (leftSyncId !== undefined && rightSyncId !== undefined && leftSyncId !== rightSyncId) {
    return leftSyncId - rightSyncId;
  }
  if (leftSyncId !== undefined && rightSyncId === undefined) {
    return -1;
  }
  if (leftSyncId === undefined && rightSyncId !== undefined) {
    return 1;
  }

  const leftMessageId = toFiniteNumber(left.messageId);
  const rightMessageId = toFiniteNumber(right.messageId);
  if (leftMessageId !== undefined && rightMessageId !== undefined && leftMessageId !== rightMessageId) {
    return leftMessageId - rightMessageId;
  }
  if (leftMessageId !== undefined && rightMessageId === undefined) {
    return -1;
  }
  if (leftMessageId === undefined && rightMessageId !== undefined) {
    return 1;
  }

  const leftCreateTime = parseTimeToMs(left.createTime);
  const rightCreateTime = parseTimeToMs(right.createTime);
  if (leftCreateTime !== undefined && rightCreateTime !== undefined && leftCreateTime !== rightCreateTime) {
    return leftCreateTime - rightCreateTime;
  }
  if (leftCreateTime !== undefined && rightCreateTime === undefined) {
    return -1;
  }
  if (leftCreateTime === undefined && rightCreateTime !== undefined) {
    return 1;
  }

  const leftTieBreaker = stableSerialize({
    content: left.content ?? "",
    messageType: left.messageType ?? 0,
    roleId: left.roleId ?? 0,
    userId: left.userId ?? 0,
    replyMessageId: left.replyMessageId ?? 0,
  });
  const rightTieBreaker = stableSerialize({
    content: right.content ?? "",
    messageType: right.messageType ?? 0,
    roleId: right.roleId ?? 0,
    userId: right.userId ?? 0,
    replyMessageId: right.replyMessageId ?? 0,
  });
  return leftTieBreaker.localeCompare(rightTieBreaker);
}

export function compareChatMessageResponsesByOrder(left: ChatMessageResponse, right: ChatMessageResponse): number {
  return compareMessageOrder(left.message, right.message);
}

export function compareMessagesByOrder(left: Message, right: Message): number {
  return compareMessageOrder(left, right);
}

export function getNextAppendPosition(messages: ChatMessageResponse[]): number {
  let maxPosition = Number.NEGATIVE_INFINITY;
  for (const item of messages) {
    const position = toFiniteNumber(item?.message?.position);
    if (position !== undefined && position > maxPosition) {
      maxPosition = position;
    }
  }
  if (!Number.isFinite(maxPosition)) {
    return 1;
  }
  return maxPosition + 1;
}
