import type { StoredMessageStreamSnapshot, StoredSnapshot } from "@/components/chat/infra/doc/document/docSnapshotTypes";

import { base64ToString, stringToBase64 } from "@/components/chat/infra/doc/shared/base64";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { MessageEditorMessage } from "../messageEditorTypes";

import {
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  normalizeMessageEditorAnnotations,
  normalizeMessageEditorContent,
  normalizeMessageEditorDraft,
  serializeMessageEditorMessages,
} from "./messageEditorTransforms";

/**
 * message editor 写入缓存的线性消息快照。
 */
export type MessageEditorSnapshot = StoredMessageStreamSnapshot;

type LegacyUserReadMeNode = {
  nodeId?: string;
  messageType?: number;
  content?: string;
  annotations?: string[];
  extra?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeLegacyUserReadMeNode(rawNode: unknown): MessageEditorMessage | null {
  if (!isRecord(rawNode)) {
    return null;
  }

  const node = rawNode as LegacyUserReadMeNode;
  const messageType = node.messageType === MESSAGE_TYPE.INTRO_TEXT ? MESSAGE_TYPE.INTRO_TEXT : MESSAGE_TYPE.TEXT;
  const content = normalizeMessageEditorContent(node.content);
  const extraRecord = isRecord(node.extra) ? { ...node.extra } : {};

  return createMessageEditorTextDraft({
    annotations: normalizeMessageEditorAnnotations(node.annotations),
    blockId: toTrimmedString(node.nodeId),
    content,
    extra: Object.keys(extraRecord).length > 0 ? extraRecord as MessageEditorMessage["extra"] : undefined,
    messageType,
  });
}

function isLegacyUserReadMeNode(value: unknown): boolean {
  return isRecord(value) && "nodeId" in value;
}

function decodeMessageEditorDrafts(updateB64: string): MessageEditorMessage[] {
  try {
    const parsed = JSON.parse(base64ToString(updateB64));
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        return isLegacyUserReadMeNode(item)
          ? normalizeLegacyUserReadMeNode(item)
          : normalizeMessageEditorDraft(item);
      })
      .filter((item): item is MessageEditorMessage => item !== null);
  }
  catch {
    return [];
  }
}

/**
 * 创建可缓存的 message-stream 快照。
 */
export function createMessageEditorSnapshot(
  messages: MessageEditorMessage[],
  updatedAt = Date.now(),
): MessageEditorSnapshot {
  return {
    v: 4,
    format: "message-stream",
    updateB64: stringToBase64(serializeMessageEditorMessages(messages)),
    updatedAt,
  };
}

/**
 * 将 snapshot 解码为可编辑的 message 流。
 */
export function decodeMessageEditorMessages(snapshot: StoredSnapshot | null | undefined): MessageEditorMessage[] {
  if (!snapshot) {
    return [];
  }

  if (snapshot.v === 4 && snapshot.format === "message-stream") {
    return decodeMessageEditorDrafts(snapshot.updateB64);
  }

  return [];
}

/**
 * 将消息流规整后再编码，用于缓存比较与保存。
 */
export function normalizeAndCreateMessageEditorSnapshot(
  messages: MessageEditorMessage[],
  updatedAt = Date.now(),
): MessageEditorSnapshot {
  return createMessageEditorSnapshot(ensureMessageEditorMessages(messages), updatedAt);
}

/**
 * 从 message-stream 快照中提取文档卡片摘要。
 */
export function readMessageEditorSnapshotExcerpt(
  snapshot: StoredSnapshot | null | undefined,
  maxChars = 220,
): string {
  const normalizedMaxChars = Number.isFinite(maxChars) && maxChars > 0 ? Math.floor(maxChars) : 220;
  const text = decodeMessageEditorMessages(snapshot)
    .map(message => normalizeMessageEditorContent(message.content))
    .map(content => content.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!text) {
    return "";
  }
  return text.length > normalizedMaxChars ? `${text.slice(0, normalizedMaxChars)}…` : text;
}
