import { normalizeMessageExtraForMatch } from "@/types/messageDraft";

import type { ChatMessageResponse } from "../../../../../api";

import { MessageType } from "../../../../../api/wsModels";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

function normalizeOptionalRefId(value: unknown): string {
  if (!isFiniteNumber(value) || value <= 0) {
    return "";
  }
  return String(value);
}

function normalizeNumericForMatch(value: unknown): string {
  if (!isFiniteNumber(value)) {
    return "";
  }
  if (value <= 0) {
    return "0";
  }
  return String(value);
}

function isMediaMessageType(messageType: unknown): boolean {
  return messageType === MessageType.IMG
    || messageType === MessageType.SOUND
    || messageType === MessageType.VIDEO
    || messageType === MessageType.FILE;
}

function buildOptimisticLooseKey(
  message: ChatMessageResponse["message"],
  options?: {
    ignoreContent?: boolean;
    ignoreAnnotations?: boolean;
    ignoreReplyMessageId?: boolean;
    ignoreExtra?: boolean;
  },
): string {
  const ignoreContent = Boolean(options?.ignoreContent);
  const ignoreAnnotations = Boolean(options?.ignoreAnnotations);
  const ignoreReplyMessageId = Boolean(options?.ignoreReplyMessageId);
  const ignoreExtra = Boolean(options?.ignoreExtra);
  const annotations = !ignoreAnnotations && Array.isArray(message.annotations)
    ? [...message.annotations].map(item => String(item)).sort().join("\u0001")
    : "";
  return [
    normalizeNumericForMatch(message.roomId),
    normalizeNumericForMatch(message.userId),
    normalizeNumericForMatch(message.roleId),
    normalizeNumericForMatch(message.messageType),
    normalizeOptionalRefId(message.threadId),
    ignoreReplyMessageId ? "" : normalizeOptionalRefId(message.replyMessageId),
    String(message.customRoleName ?? "").trim(),
    ignoreContent ? "" : String(message.content ?? ""),
    annotations,
    stableSerialize(message.webgal),
    ignoreExtra ? "" : stableSerialize(normalizeMessageExtraForMatch(message.messageType, message.extra)),
  ].join("|");
}

export function collectPersistedOptimisticDuplicateIds(messages: ChatMessageResponse[]): number[] {
  const positiveLooseKeys = new Set<string>();
  const positiveMediaLooseKeys = new Set<string>();
  const positiveDiceLooseKeys = new Set<string>();

  for (const item of messages) {
    const message = item.message;
    if (!message || message.messageId <= 0 || message.status === 1) {
      continue;
    }
    positiveLooseKeys.add(buildOptimisticLooseKey(message));
    if (isMediaMessageType(message.messageType)) {
      positiveMediaLooseKeys.add(buildOptimisticLooseKey(message, {
        ignoreContent: true,
        ignoreAnnotations: true,
      }));
    }
    if (message.messageType === MessageType.DICE) {
      positiveDiceLooseKeys.add(buildOptimisticLooseKey(message, {
        ignoreReplyMessageId: true,
        ignoreExtra: true,
      }));
    }
  }

  const duplicateIds: number[] = [];
  for (const item of messages) {
    const message = item.message;
    if (!message || message.messageId >= 0 || message.status === 1) {
      continue;
    }

    const looseKey = buildOptimisticLooseKey(message);
    const mediaLooseKey = isMediaMessageType(message.messageType)
      ? buildOptimisticLooseKey(message, {
          ignoreContent: true,
          ignoreAnnotations: true,
        })
      : "";
    const diceLooseKey = message.messageType === MessageType.DICE
      ? buildOptimisticLooseKey(message, {
          ignoreReplyMessageId: true,
          ignoreExtra: true,
        })
      : "";

    if (
      positiveLooseKeys.has(looseKey)
      || (mediaLooseKey && positiveMediaLooseKeys.has(mediaLooseKey))
      || (diceLooseKey && positiveDiceLooseKeys.has(diceLooseKey))
    ) {
      duplicateIds.push(message.messageId);
    }
  }

  return duplicateIds;
}
