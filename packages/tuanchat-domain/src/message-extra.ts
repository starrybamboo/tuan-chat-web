import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { MessageExtra } from "@tuanchat/openapi-client/models/MessageExtra";

import { hasHostPrivileges } from "./member-permissions";

type MessageExtraKey = keyof MessageExtra;
type NestedMessageExtra<K extends MessageExtraKey> = NonNullable<MessageExtra[K]>;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getNestedMessageExtra<K extends MessageExtraKey>(
  extra: unknown,
  key: K,
): NestedMessageExtra<K> | undefined {
  const record = toRecord(extra);
  if (!record) {
    return undefined;
  }
  const nested = toRecord(record[key]);
  return nested ? nested as NestedMessageExtra<K> : undefined;
}

export function getImageMessageExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "imageMessage");
}

export function getFileMessageExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "fileMessage");
}

export function getSoundMessageExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "soundMessage");
}

export function getVideoMessageExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "videoMessage");
}

export function getDiceResultExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "diceResult");
}

export function getDiceTurnExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "diceTurn");
}

export function getDiceTurnCommandText(extra: unknown): string {
  const command = getDiceTurnExtra(extra)?.command;
  return typeof command === "string" ? command.trim() : "";
}

export function getDiceTurnReplies(extra: unknown) {
  const replies = getDiceTurnExtra(extra)?.replies;
  return Array.isArray(replies) ? replies : [];
}

export function getDiceTurnReplyText(extra: unknown): string {
  return getDiceTurnReplies(extra)
    .map(reply => typeof reply?.content === "string" ? reply.content.trim() : "")
    .filter(Boolean)
    .join("；");
}

export function canViewHiddenDiceTurnReply(
  message: Message | null | undefined,
  context: {
    currentUserId?: number | null;
    memberType?: number | null;
  },
): boolean {
  const replies = getDiceTurnReplies(message?.extra);
  if (replies.length === 0 || !replies.some(reply => reply?.hidden === true)) {
    return true;
  }

  if (
    typeof context.currentUserId === "number"
    && context.currentUserId > 0
    && context.currentUserId === message?.userId
  ) {
    return true;
  }

  return hasHostPrivileges(context.memberType);
}

export function getForwardMessageExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "forwardMessage");
}

export function getClueMessageExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "clueMessage");
}

export function getCommandRequestExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "commandRequest");
}

export function getDocCardExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "docCard");
}

export function getRoomJumpExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "roomJump");
}

export function getStateEventExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "stateEvent");
}

export function getPokeExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "poke");
}
