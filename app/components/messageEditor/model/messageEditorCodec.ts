import type { StoredSnapshot } from "@/components/chat/infra/doc/description/descriptionDocRemote";
import type { MessageDraft } from "@/types/messageDraft";

import { base64ToString, stringToBase64 } from "@/components/chat/infra/doc/shared/base64";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  normalizeMessageEditorAnnotations,
  normalizeMessageEditorContent,
  normalizeMessageEditorDraft,
  serializeMessageEditorMessages,
} from "./messageEditorTransforms";

/**
 * 线性 message editor 使用的远端快照格式。
 */
export type MessageEditorSnapshot = {
  v: 4;
  format: "message-stream";
  updateB64: string;
  updatedAt: number;
};

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

function normalizeLegacyUserReadMeNode(rawNode: unknown): MessageDraft | null {
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
    extra: Object.keys(extraRecord).length > 0 ? extraRecord as MessageDraft["extra"] : undefined,
    messageType,
  });
}

function isLegacyUserReadMeNode(value: unknown): boolean {
  return isRecord(value) && "nodeId" in value;
}

function decodeMessageEditorDrafts(updateB64: string): MessageDraft[] {
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
      .filter((item): item is MessageDraft => item !== null);
  }
  catch {
    return [];
  }
}

/**
 * 创建可持久化的 message-stream 快照。
 */
export function createMessageEditorSnapshot(
  messages: MessageDraft[],
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
 * 将远端 snapshot 解码为可编辑的 message 流。
 */
export function decodeMessageEditorMessages(snapshot: StoredSnapshot | null | undefined): MessageDraft[] {
  if (!snapshot) {
    return [];
  }

  if (snapshot.v === 4 && snapshot.format === "message-stream") {
    return decodeMessageEditorDrafts(snapshot.updateB64);
  }

  return [];
}

/**
 * 将消息流规整后再编码，用于缓存比较与远端保存。
 */
export function normalizeAndCreateMessageEditorSnapshot(
  messages: MessageDraft[],
  updatedAt = Date.now(),
): MessageEditorSnapshot {
  return createMessageEditorSnapshot(ensureMessageEditorMessages(messages), updatedAt);
}
