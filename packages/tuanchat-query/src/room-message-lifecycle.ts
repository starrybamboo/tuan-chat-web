import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { mergeRoomMessages } from "./room-message";

export type RoomMessageLocalSyncState = "optimistic";

export type RoomMessageSyncLike = {
  messageId?: number;
  status?: number;
  tcLocalRenderKey?: string | null;
  tcLocalSyncState?: RoomMessageLocalSyncState | string | null;
};

const OPTIMISTIC_RENDER_KEY_PREFIX = "room-message:optimistic:";

export function getRoomMessageLocalRenderKey(message: RoomMessageSyncLike | null | undefined): string | null {
  const renderKey = message?.tcLocalRenderKey;
  return typeof renderKey === "string" && renderKey.trim() ? renderKey : null;
}

function getOptimisticRenderKey(message: RoomMessageSyncLike | null | undefined): string | null {
  const localRenderKey = getRoomMessageLocalRenderKey(message);
  if (localRenderKey) {
    return localRenderKey;
  }
  const messageId = message?.messageId;
  if (typeof messageId === "number" && Number.isFinite(messageId) && messageId < 0) {
    return `${OPTIMISTIC_RENDER_KEY_PREFIX}${messageId}`;
  }
  return null;
}

export function isOptimisticRoomMessage(message: RoomMessageSyncLike | null | undefined): boolean {
  if (!message || message.status === 1) {
    return false;
  }
  if (message.tcLocalSyncState === "optimistic") {
    return true;
  }
  return typeof message.messageId === "number" && Number.isFinite(message.messageId) && message.messageId < 0;
}

export function markOptimisticRoomMessage<T extends RoomMessageSyncLike>(message: T): T {
  return {
    ...message,
    tcLocalSyncState: "optimistic",
  };
}

export function clearOptimisticRoomMessage<T extends RoomMessageSyncLike>(message: T): T {
  if (!message || message.tcLocalSyncState == null) {
    return message;
  }
  const { tcLocalSyncState: _tcLocalSyncState, ...rest } = message;
  return rest as T;
}

// --- Optimistic message creation ---

export type CreateOptimisticRoomMessageOptions = {
  optimisticId: number;
  currentUserId: number;
  position: number;
};

export function createOptimisticRoomMessage(
  request: ChatMessageRequest,
  options: CreateOptimisticRoomMessageOptions,
): ChatMessageResponse {
  const nowIso = new Date().toISOString();
  const optimisticMessage: ChatMessageResponse["message"] & RoomMessageSyncLike = {
    tcLocalSyncState: "optimistic",
    tcLocalRenderKey: `${OPTIMISTIC_RENDER_KEY_PREFIX}${options.optimisticId}:${nowIso}`,
    messageId: options.optimisticId,
    syncId: options.optimisticId,
    roomId: request.roomId,
    userId: options.currentUserId > 0 ? options.currentUserId : 0,
    roleId: request.roleId,
    content: request.content ?? "",
    customRoleName: request.customRoleName,
    annotations: request.annotations,
    avatarId: request.avatarId,
    webgal: request.webgal,
    replyMessageId: request.replayMessageId,
    status: 0,
    messageType: request.messageType,
    position: typeof request.position === "number" ? request.position : options.position,
    extra: request.extra as Message["extra"],
    createTime: nowIso,
    updateTime: nowIso,
  };
  return {
    message: optimisticMessage,
  };
}

export function getNextAppendPosition(messages: readonly ChatMessageResponse[]): number {
  let maxPosition = Number.NEGATIVE_INFINITY;
  for (const item of messages) {
    const position = item?.message?.position;
    if (typeof position === "number" && Number.isFinite(position) && position > maxPosition) {
      maxPosition = position;
    }
  }
  return Number.isFinite(maxPosition) ? maxPosition + 1 : 1;
}

// --- Optimistic commit/replace ---

export function buildCommittedRoomMessage(
  optimisticMessage: ChatMessageResponse | undefined,
  serverMessage: Message,
): ChatMessageResponse {
  const optimistic = optimisticMessage?.message;
  const localRenderKey = getOptimisticRenderKey(optimistic);
  const nextMessage = clearOptimisticRoomMessage({
    ...serverMessage,
    ...(localRenderKey ? { tcLocalRenderKey: localRenderKey } : {}),
    position: typeof serverMessage.position === "number"
      ? serverMessage.position
      : optimistic?.position,
  });
  return {
    message: nextMessage as Message,
  };
}

export function commitOptimisticRoomMessageInList(
  currentMessages: ChatMessageResponse[] | undefined,
  optimisticId: number,
  serverMessage: Message,
): ChatMessageResponse[] {
  const messages = currentMessages ?? [];
  const optimistic = messages.find(m => m.message?.messageId === optimisticId);
  const existingCommitted = messages.find(m => m.message?.messageId === serverMessage.messageId);
  const committed = buildCommittedRoomMessage(optimistic ?? existingCommitted, serverMessage);
  return mergeRoomMessages(
    messages.filter(m => m.message?.messageId !== optimisticId),
    [committed],
  );
}

// --- Remove ---

export function removeRoomMessageFromList(
  currentMessages: ChatMessageResponse[] | undefined,
  messageId: number,
): ChatMessageResponse[] {
  return (currentMessages ?? []).filter(m => m.message?.messageId !== messageId);
}

export function removeRoomMessagesFromList(
  currentMessages: ChatMessageResponse[] | undefined,
  messageIds: number[],
): ChatMessageResponse[] {
  const idSet = new Set(messageIds);
  return (currentMessages ?? []).filter(m => !idSet.has(m.message?.messageId));
}

// --- Restore from snapshot ---

export function restoreRoomMessageInList(
  currentMessages: ChatMessageResponse[] | undefined,
  snapshot: ChatMessageResponse,
): ChatMessageResponse[] {
  const snapshotId = snapshot.message?.messageId;
  const messages = currentMessages ?? [];
  const exists = messages.some(m => m.message?.messageId === snapshotId);
  if (exists) {
    return mergeRoomMessages(messages.map(m =>
      m.message?.messageId === snapshotId ? snapshot : m,
    ));
  }
  return mergeRoomMessages(messages, [snapshot]);
}

export function restoreRoomMessagesInList(
  currentMessages: ChatMessageResponse[] | undefined,
  snapshots: ChatMessageResponse[],
): ChatMessageResponse[] {
  return snapshots.reduce(
    (messages, snapshot) => restoreRoomMessageInList(messages, snapshot),
    currentMessages ?? [],
  );
}

// --- Duplicate optimistic cleanup ---

function isMediaMessageType(messageType: unknown): boolean {
  return messageType === MESSAGE_TYPE.IMG
    || messageType === MESSAGE_TYPE.SOUND
    || messageType === MESSAGE_TYPE.VIDEO
    || messageType === MESSAGE_TYPE.FILE;
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

function stableSerializeOptionalPayload(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length === 0) {
    return "null";
  }
  return stableSerialize(value);
}

function normalizeNumericForMatch(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }
  return value <= 0 ? "0" : String(value);
}

function normalizeOptionalRefId(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "";
  }
  return String(value);
}

function buildOptimisticLooseKey(
  message: Message,
  options?: {
    ignoreContent?: boolean;
    ignoreAnnotations?: boolean;
    ignoreReplyMessageId?: boolean;
    ignoreExtra?: boolean;
  },
): string {
  const annotations = !options?.ignoreAnnotations && Array.isArray(message.annotations)
    ? [...message.annotations].map(item => String(item)).sort().join("")
    : "";
  return [
    normalizeNumericForMatch(message.roomId),
    normalizeNumericForMatch(message.userId),
    normalizeNumericForMatch(message.roleId),
    normalizeNumericForMatch(message.messageType),
    options?.ignoreReplyMessageId ? "" : normalizeOptionalRefId(message.replyMessageId),
    String(message.customRoleName ?? "").trim(),
    options?.ignoreContent ? "" : String(message.content ?? ""),
    annotations,
    stableSerializeOptionalPayload(message.webgal),
    options?.ignoreExtra ? "" : stableSerializeOptionalPayload(message.extra),
  ].join("|");
}

function buildOptimisticMatchKeys(message: Message): string[] {
  const keys = [buildOptimisticLooseKey(message)];
  if (isMediaMessageType(message.messageType)) {
    keys.push(buildOptimisticLooseKey(message, {
      ignoreContent: true,
      ignoreAnnotations: true,
    }));
  }
  if (message.messageType === MESSAGE_TYPE.DICE) {
    keys.push(buildOptimisticLooseKey(message, {
      ignoreReplyMessageId: true,
      ignoreExtra: true,
    }));
  }
  return keys;
}

function hasSharedOptimisticMatchKey(left: Message, right: Message): boolean {
  const rightKeys = new Set(buildOptimisticMatchKeys(right));
  return buildOptimisticMatchKeys(left).some(key => rightKeys.has(key));
}

function hasSameFinitePosition(left: Message, right: Message): boolean {
  return typeof left.position === "number"
    && Number.isFinite(left.position)
    && typeof right.position === "number"
    && Number.isFinite(right.position)
    && left.position === right.position;
}

function findMatchingOptimisticMessage(
  optimisticCandidates: ChatMessageResponse[],
  incomingMessage: Message,
  matchedOptimisticIds: ReadonlySet<number>,
): ChatMessageResponse | undefined {
  const candidates = optimisticCandidates.filter((candidate) => {
    const candidateMessage = candidate.message;
    if (!candidateMessage || matchedOptimisticIds.has(candidateMessage.messageId)) {
      return false;
    }
    return hasSharedOptimisticMatchKey(incomingMessage, candidateMessage);
  });

  return candidates.find(candidate => hasSameFinitePosition(incomingMessage, candidate.message))
    ?? candidates[0];
}

export function reconcileOptimisticRoomMessagesInList(
  currentMessages: ChatMessageResponse[] | undefined,
  incomingMessages: ChatMessageResponse[],
): ChatMessageResponse[] {
  const current = currentMessages ?? [];
  if (incomingMessages.length === 0) {
    return mergeRoomMessages(current);
  }

  const optimisticCandidates = current.filter(item => isOptimisticRoomMessage(item.message));
  if (optimisticCandidates.length === 0) {
    return mergeRoomMessages(current, incomingMessages);
  }

  const matchedOptimisticIds = new Set<number>();
  const reconciledIncomingMessages = incomingMessages.map((incoming) => {
    const incomingMessage = incoming.message;
    if (
      !incomingMessage
      || incomingMessage.status === 1
      || isOptimisticRoomMessage(incomingMessage)
      || incomingMessage.messageId <= 0
    ) {
      return incoming;
    }

    const matchedOptimistic = findMatchingOptimisticMessage(
      optimisticCandidates,
      incomingMessage,
      matchedOptimisticIds,
    );

    if (!matchedOptimistic) {
      return incoming;
    }

    matchedOptimisticIds.add(matchedOptimistic.message.messageId);
    const localRenderKey = getOptimisticRenderKey(matchedOptimistic.message);
    return {
      ...incoming,
      message: clearOptimisticRoomMessage({
        ...incomingMessage,
        ...(localRenderKey ? { tcLocalRenderKey: localRenderKey } : {}),
      }) as Message,
    };
  });

  if (matchedOptimisticIds.size === 0) {
    return mergeRoomMessages(current, incomingMessages);
  }

  return mergeRoomMessages(
    current.filter(item => !matchedOptimisticIds.has(item.message?.messageId)),
    reconciledIncomingMessages,
  );
}

export function collectPersistedOptimisticDuplicateIds(messages: ChatMessageResponse[]): number[] {
  const positiveLooseKeys = new Set<string>();
  const positiveMediaLooseKeys = new Set<string>();
  const positiveDiceLooseKeys = new Set<string>();

  for (const item of messages) {
    const message = item.message;
    if (!message || message.status === 1 || isOptimisticRoomMessage(message) || message.messageId <= 0) {
      continue;
    }
    positiveLooseKeys.add(buildOptimisticLooseKey(message));
    if (isMediaMessageType(message.messageType)) {
      positiveMediaLooseKeys.add(buildOptimisticLooseKey(message, {
        ignoreContent: true,
        ignoreAnnotations: true,
      }));
    }
    if (message.messageType === MESSAGE_TYPE.DICE) {
      positiveDiceLooseKeys.add(buildOptimisticLooseKey(message, {
        ignoreReplyMessageId: true,
        ignoreExtra: true,
      }));
    }
  }

  const duplicateIds: number[] = [];
  for (const item of messages) {
    const message = item.message;
    if (!message || message.status === 1 || !isOptimisticRoomMessage(message)) {
      continue;
    }

    if (
      positiveLooseKeys.has(buildOptimisticLooseKey(message))
      || (isMediaMessageType(message.messageType)
        && positiveMediaLooseKeys.has(buildOptimisticLooseKey(message, {
          ignoreContent: true,
          ignoreAnnotations: true,
        })))
        || (message.messageType === MESSAGE_TYPE.DICE
          && positiveDiceLooseKeys.has(buildOptimisticLooseKey(message, {
            ignoreReplyMessageId: true,
            ignoreExtra: true,
          })))
    ) {
      duplicateIds.push(message.messageId);
    }
  }

  return duplicateIds;
}
