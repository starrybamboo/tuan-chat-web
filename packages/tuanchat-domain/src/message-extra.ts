import type { MessageExtra } from "@tuanchat/openapi-client/models/MessageExtra";

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

export function getThreadRootExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "threadRoot");
}

export function getStateEventExtra(extra: unknown) {
  return getNestedMessageExtra(extra, "stateEvent");
}
