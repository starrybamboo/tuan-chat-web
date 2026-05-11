import type { StoredSnapshot } from "@/components/chat/infra/doc/description/descriptionDocRemote";
import type { BlockNoteDocBlock } from "@/components/chat/infra/doc/document/legacyRichTextSnapshot";
import type { MessageDraft } from "@/types/messageDraft";
import type { MessageEditorPayload } from "@tuanchat/domain";

import {
  decodeBlockNoteBlocks,
  isStoredBlockNoteSnapshot,
} from "@/components/chat/infra/doc/document/legacyRichTextSnapshot";
import { base64ToString, stringToBase64 } from "@/components/chat/infra/doc/shared/base64";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import {
  createMessageEditorEntityId,
  setMessageEditorPayload,
} from "@tuanchat/domain";

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

  const payload: MessageEditorPayload = {
    blockId: toTrimmedString(node.nodeId) ?? createMessageEditorEntityId("block"),
    blockType: messageType === MESSAGE_TYPE.INTRO_TEXT ? "intro" : "paragraph",
  };

  const extra = setMessageEditorPayload(
    Object.keys(extraRecord).length > 0 ? extraRecord : undefined,
    payload,
  ) as MessageDraft["extra"] | undefined;

  return {
    messageType,
    content,
    ...(normalizeMessageEditorAnnotations(node.annotations) ? { annotations: normalizeMessageEditorAnnotations(node.annotations) } : {}),
    ...(extra ? { extra } : {}),
  };
}

function isLegacyUserReadMeNode(value: unknown): boolean {
  return isRecord(value) && "nodeId" in value;
}

function collectInlineText(content: unknown, parts: string[]) {
  if (!content) {
    return;
  }
  if (typeof content === "string") {
    const normalized = content.replace(/\s+/g, " ").trim();
    if (normalized) {
      parts.push(normalized);
    }
    return;
  }
  if (Array.isArray(content)) {
    for (const item of content) {
      collectInlineText(item, parts);
    }
    return;
  }
  if (!isRecord(content)) {
    return;
  }

  const text = typeof content.text === "string" ? content.text.replace(/\s+/g, " ").trim() : "";
  if (text) {
    parts.push(text);
  }
  collectInlineText(content.content, parts);
}

function blockNoteHeadingType(block: BlockNoteDocBlock) {
  if (block.type !== "heading") {
    return "paragraph";
  }
  const level = typeof (block.props as { level?: unknown } | undefined)?.level === "number"
    ? (block.props as { level: number }).level
    : 1;
  if (level === 2) {
    return "heading2";
  }
  if (level >= 3) {
    return "heading3";
  }
  return "heading1";
}

function flattenBlockNoteBlocks(blocks: BlockNoteDocBlock[], messages: MessageDraft[]) {
  for (const block of blocks) {
    const parts: string[] = [];
    collectInlineText(block.content, parts);
    const text = parts.join(" ").replace(/\s+/g, " ").trim();

    if (text) {
      messages.push(createMessageEditorTextDraft({
        content: text,
        blockType: blockNoteHeadingType(block),
      }));
    }

    if (Array.isArray(block.children) && block.children.length > 0) {
      flattenBlockNoteBlocks(block.children as BlockNoteDocBlock[], messages);
    }
  }
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

  if (isStoredBlockNoteSnapshot(snapshot)) {
    const messages: MessageDraft[] = [];
    flattenBlockNoteBlocks(decodeBlockNoteBlocks(snapshot), messages);
    return messages;
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
