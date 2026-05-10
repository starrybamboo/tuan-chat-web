import type { StoredSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import type { BlockNoteDocBlock } from "@/components/chat/infra/blocksuite/document/blockNoteSnapshot";
import type { MessageDraft } from "@/types/messageDraft";
import type {
  MessageEditorBlockType,
  MessageEditorInlineMark,
  MessageEditorInlineMarkType,
  MessageEditorPayload,
} from "@tuanchat/domain/messageEditor";

import { decodeBlockNoteBlocks, isStoredBlockNoteSnapshot } from "@/components/chat/infra/blocksuite/document/blockNoteSnapshot";
import { base64ToString, stringToBase64 } from "@/components/chat/infra/blocksuite/shared/base64";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import {
  createMessageEditorEntityId,
  getMessageEditorPayload,
  isMessageEditorTextMessageType,
  normalizeMessageEditorInlineMarks,
  setMessageEditorPayload,
} from "@tuanchat/domain/messageEditor";

/**
 * 线性 message editor 使用的远端快照格式。
 */
export type MessageEditorSnapshot = {
  v: 4;
  format: "message-stream";
  updateB64: string;
  updatedAt: number;
};

/**
 * 文本块拆分后的聚焦位置。
 */
export type MessageEditorFocusTarget = {
  blockId: string;
  caret: number;
};

/**
 * 块拆分结果。
 */
export type MessageEditorSplitResult = {
  messages: MessageDraft[];
  focus: MessageEditorFocusTarget;
};

/**
 * 块合并结果。
 */
export type MessageEditorMergeResult = {
  messages: MessageDraft[];
  focus: MessageEditorFocusTarget;
};

type MessageDraftExtra = NonNullable<MessageDraft["extra"]>;

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

function normalizeAnnotations(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const annotations = value.filter((item): item is string => {
    return typeof item === "string" && item.trim().length > 0;
  });
  return annotations.length > 0 ? annotations : undefined;
}

function normalizeContent(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toMessageDraftExtra(value: unknown): MessageDraftExtra | undefined {
  return isRecord(value) ? value as MessageDraftExtra : undefined;
}

function normalizeBlockType(messageType: number | undefined, payload: MessageEditorPayload | undefined): MessageEditorBlockType {
  if (messageType === MESSAGE_TYPE.INTRO_TEXT) {
    return "intro";
  }
  return payload?.blockType === "heading1"
    || payload?.blockType === "heading2"
    || payload?.blockType === "heading3"
    ? payload.blockType
    : "paragraph";
}

function normalizeEditorPayload(
  value: unknown,
  content: string,
  messageType: number | undefined,
): MessageEditorPayload {
  const payload = getMessageEditorPayload(value, content.length, messageType);
  return {
    blockId: payload?.blockId ?? createMessageEditorEntityId("block"),
    blockType: normalizeBlockType(messageType, payload),
    inlineMarks: normalizeMessageEditorInlineMarks(payload?.inlineMarks, content.length),
  };
}

function normalizeMessageType(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : MESSAGE_TYPE.TEXT;
}

function normalizeMessageDraft(rawMessage: unknown): MessageDraft | null {
  if (!isRecord(rawMessage)) {
    return null;
  }

  const messageType = normalizeMessageType(rawMessage.messageType);
  const content = normalizeContent(rawMessage.content);
  const extra = toMessageDraftExtra(rawMessage.extra);
  const payload = normalizeEditorPayload(extra, content, messageType);
  const normalizedExtra = setMessageEditorPayload(extra, payload) as MessageDraft["extra"] | undefined;

  const nextMessage: MessageDraft = {
    messageType,
    content,
    ...(normalizeAnnotations(rawMessage.annotations) ? { annotations: normalizeAnnotations(rawMessage.annotations) } : {}),
    ...(normalizedExtra ? { extra: normalizedExtra } : {}),
    ...(isRecord(rawMessage.webgal) ? { webgal: rawMessage.webgal as Record<string, Record<string, any>> } : {}),
    ...(typeof rawMessage.roleId === "number" ? { roleId: rawMessage.roleId } : {}),
    ...(typeof rawMessage.avatarId === "number" ? { avatarId: rawMessage.avatarId } : {}),
    ...(toTrimmedString(rawMessage.customRoleName) ? { customRoleName: toTrimmedString(rawMessage.customRoleName) } : {}),
  };

  if (messageType === MESSAGE_TYPE.INTRO_TEXT) {
    nextMessage.extra = setMessageEditorPayload(nextMessage.extra, {
      ...payload,
      blockType: "intro",
    }) as MessageDraft["extra"];
  }

  return nextMessage;
}

function normalizeLegacyUserReadMeNode(rawNode: unknown): MessageDraft | null {
  if (!isRecord(rawNode)) {
    return null;
  }

  const node = rawNode as LegacyUserReadMeNode;
  const messageType = node.messageType === MESSAGE_TYPE.INTRO_TEXT ? MESSAGE_TYPE.INTRO_TEXT : MESSAGE_TYPE.TEXT;
  const content = normalizeContent(node.content);
  const extraRecord = isRecord(node.extra) ? { ...node.extra } : {};
  const inlineMarks = Array.isArray(extraRecord.inlineMarks) ? extraRecord.inlineMarks as MessageEditorInlineMark[] : undefined;
  delete extraRecord.inlineMarks;

  const payload: MessageEditorPayload = {
    blockId: toTrimmedString(node.nodeId) ?? createMessageEditorEntityId("block"),
    blockType: messageType === MESSAGE_TYPE.INTRO_TEXT ? "intro" : "paragraph",
    inlineMarks: normalizeMessageEditorInlineMarks(inlineMarks, content.length),
  };

  const extra = setMessageEditorPayload(
    Object.keys(extraRecord).length > 0 ? extraRecord : undefined,
    payload,
  ) as MessageDraft["extra"] | undefined;

  return {
    messageType,
    content,
    ...(normalizeAnnotations(node.annotations) ? { annotations: normalizeAnnotations(node.annotations) } : {}),
    ...(extra ? { extra } : {}),
  };
}

function isLegacyUserReadMeNode(value: unknown): boolean {
  return isRecord(value) && ("nodeId" in value || (isRecord(value.extra) && Array.isArray((value.extra as Record<string, unknown>).inlineMarks)));
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

function blockNoteHeadingType(block: BlockNoteDocBlock): MessageEditorBlockType {
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
          : normalizeMessageDraft(item);
      })
      .filter((item): item is MessageDraft => item !== null);
  }
  catch {
    return [];
  }
}

/**
 * 创建一个默认的文本草稿块。
 */
export function createMessageEditorTextDraft(overrides: {
  annotations?: string[];
  blockId?: string;
  blockType?: MessageEditorBlockType;
  content?: string;
  extra?: MessageDraft["extra"];
  messageType?: MessageDraft["messageType"];
} = {}): MessageDraft {
  const messageType = overrides.messageType ?? (overrides.blockType === "intro" ? MESSAGE_TYPE.INTRO_TEXT : MESSAGE_TYPE.TEXT);
  const content = typeof overrides.content === "string" ? overrides.content : "";
  const extra = toMessageDraftExtra(overrides.extra);
  const payload: MessageEditorPayload = {
    blockId: overrides.blockId ?? createMessageEditorEntityId("block"),
    blockType: overrides.blockType ?? (messageType === MESSAGE_TYPE.INTRO_TEXT ? "intro" : "paragraph"),
    inlineMarks: normalizeMessageEditorInlineMarks(
      getMessageEditorPayload(extra, content.length, messageType)?.inlineMarks,
      content.length,
    ),
  };

  return {
    messageType,
    content,
    ...(overrides.annotations && overrides.annotations.length > 0 ? { annotations: overrides.annotations } : {}),
    extra: setMessageEditorPayload(extra, payload) as MessageDraft["extra"],
  };
}

/**
 * 保证编辑器至少持有一个可聚焦块。
 */
export function ensureMessageEditorMessages(messages: MessageDraft[]): MessageDraft[] {
  const normalized = messages
    .map(message => normalizeMessageDraft(message))
    .filter((message): message is MessageDraft => message !== null);

  return normalized.length > 0 ? normalized : [createMessageEditorTextDraft()];
}

/**
 * 为任意消息读取稳定块 ID。
 */
export function getMessageEditorBlockId(message: MessageDraft): string {
  return normalizeEditorPayload(message.extra, normalizeContent(message.content), message.messageType).blockId;
}

/**
 * 读取块样式类型。
 */
export function getMessageEditorBlockType(message: MessageDraft): MessageEditorBlockType {
  return normalizeBlockType(message.messageType, getMessageEditorPayload(message.extra, normalizeContent(message.content).length, message.messageType));
}

/**
 * 设置块级样式，并在 intro/正文文本类型之间同步 `messageType`。
 */
export function setMessageEditorBlockType(
  message: MessageDraft,
  blockType: MessageEditorBlockType,
): MessageDraft {
  const content = normalizeContent(message.content);
  const payload = normalizeEditorPayload(message.extra, content, blockType === "intro" ? MESSAGE_TYPE.INTRO_TEXT : MESSAGE_TYPE.TEXT);

  return {
    ...message,
    messageType: blockType === "intro" ? MESSAGE_TYPE.INTRO_TEXT : MESSAGE_TYPE.TEXT,
    extra: setMessageEditorPayload(message.extra, {
      ...payload,
      blockType,
    }) as MessageDraft["extra"],
  };
}

/**
 * 判断当前消息是否属于 editor 内可直接编辑的文本块。
 */
export function isMessageEditorTextMessage(message: MessageDraft): boolean {
  return isMessageEditorTextMessageType(message.messageType);
}

/**
 * 读取文本块上的行内样式区间。
 */
export function getMessageEditorInlineMarks(message: MessageDraft): MessageEditorInlineMark[] {
  return normalizeEditorPayload(
    message.extra,
    normalizeContent(message.content),
    message.messageType,
  ).inlineMarks ?? [];
}

/**
 * 写回行内样式区间。
 */
export function setMessageEditorInlineMarks(
  message: MessageDraft,
  marks: MessageEditorInlineMark[],
): MessageDraft {
  const content = normalizeContent(message.content);
  const payload = normalizeEditorPayload(message.extra, content, message.messageType);

  return {
    ...message,
    extra: setMessageEditorPayload(message.extra, {
      ...payload,
      inlineMarks: normalizeMessageEditorInlineMarks(marks, content.length),
    }) as MessageDraft["extra"],
  };
}

/**
 * 切换非颜色类行内样式。
 */
export function toggleMessageEditorInlineMark(
  message: MessageDraft,
  params: {
    type: Exclude<MessageEditorInlineMarkType, "color">;
    start: number;
    end: number;
  },
): MessageDraft {
  const content = normalizeContent(message.content);
  const start = Math.max(0, Math.min(params.start, content.length));
  const end = Math.max(start, Math.min(params.end, content.length));
  if (end <= start) {
    return message;
  }

  const marks = getMessageEditorInlineMarks(message);
  const sameTypeMarks = marks.filter(mark => mark.type === params.type);
  const selectionFullyCovered = sameTypeMarks.some(mark => mark.start <= start && mark.end >= end);

  if (selectionFullyCovered) {
    return setMessageEditorInlineMarks(message, marks.flatMap((mark) => {
      if (mark.type !== params.type || mark.end <= start || mark.start >= end) {
        return [mark];
      }

      const fragments: MessageEditorInlineMark[] = [];
      if (mark.start < start) {
        fragments.push({
          ...mark,
          end: start,
        });
      }
      if (mark.end > end) {
        fragments.push({
          ...mark,
          start: end,
        });
      }
      return fragments;
    }));
  }

  return setMessageEditorInlineMarks(message, [
    ...marks,
    {
      markId: createMessageEditorEntityId("mark"),
      type: params.type,
      start,
      end,
    },
  ]);
}

/**
 * 设置或清理颜色样式。
 */
export function setMessageEditorColorMark(
  message: MessageDraft,
  params: {
    color?: string;
    start: number;
    end: number;
  },
): MessageDraft {
  const content = normalizeContent(message.content);
  const start = Math.max(0, Math.min(params.start, content.length));
  const end = Math.max(start, Math.min(params.end, content.length));
  if (end <= start) {
    return message;
  }

  const nextMarks = getMessageEditorInlineMarks(message).flatMap((mark) => {
    if (mark.type !== "color" || mark.end <= start || mark.start >= end) {
      return [mark];
    }

    const fragments: MessageEditorInlineMark[] = [];
    if (mark.start < start) {
      fragments.push({ ...mark, end: start });
    }
    if (mark.end > end) {
      fragments.push({ ...mark, start: end });
    }
    return fragments;
  });

  const color = toTrimmedString(params.color);
  if (!color) {
    return setMessageEditorInlineMarks(message, nextMarks);
  }

  return setMessageEditorInlineMarks(message, [
    ...nextMarks,
    {
      markId: createMessageEditorEntityId("mark"),
      type: "color",
      start,
      end,
      color,
    },
  ]);
}

/**
 * 将消息列表序列化成稳定字符串，用于脏检查与去重。
 */
export function serializeMessageEditorMessages(messages: MessageDraft[]): string {
  return JSON.stringify(ensureMessageEditorMessages(messages).map((message) => {
    const content = normalizeContent(message.content);
    const payload = normalizeEditorPayload(message.extra, content, message.messageType);
    const nextExtra = setMessageEditorPayload(message.extra, payload);
    return {
      annotations: normalizeAnnotations(message.annotations) ?? [],
      avatarId: message.avatarId ?? null,
      content,
      customRoleName: toTrimmedString(message.customRoleName) ?? "",
      extra: nextExtra ?? null,
      messageType: message.messageType ?? MESSAGE_TYPE.TEXT,
      roleId: message.roleId ?? null,
      webgal: message.webgal ?? {},
    };
  }));
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
 * 将任意远端 snapshot 解析成 message editor 可编辑的线性消息流。
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
 * 在当前光标位置拆分文本块。
 */
export function splitMessageEditorMessage(
  messages: MessageDraft[],
  params: {
    blockId: string;
    selectionEnd: number;
    selectionStart: number;
  },
): MessageEditorSplitResult {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === params.blockId);
  if (index < 0) {
    const fallback = createMessageEditorTextDraft();
    return {
      messages: [...normalizedMessages, fallback],
      focus: {
        blockId: getMessageEditorBlockId(fallback),
        caret: 0,
      },
    };
  }

  const current = normalizedMessages[index];
  const content = normalizeContent(current.content);
  const selectionStart = Math.max(0, Math.min(params.selectionStart, content.length));
  const selectionEnd = Math.max(selectionStart, Math.min(params.selectionEnd, content.length));
  const before = content.slice(0, selectionStart);
  const after = content.slice(selectionEnd);
  const currentMarks = getMessageEditorInlineMarks(current);
  const beforeMarks = currentMarks.flatMap((mark) => {
    if (mark.start >= selectionStart) {
      return [];
    }
    return [{
      ...mark,
      end: Math.min(mark.end, selectionStart),
    }];
  });
  const afterMarks = currentMarks.flatMap((mark) => {
    if (mark.end <= selectionEnd) {
      return [];
    }
    return [{
      ...mark,
      start: Math.max(0, mark.start - selectionEnd),
      end: mark.end - selectionEnd,
    }];
  });

  const currentBlockType = getMessageEditorBlockType(current);
  const beforeMessage = setMessageEditorInlineMarks({
    ...current,
    content: before,
  }, beforeMarks);
  const nextMessage = setMessageEditorInlineMarks(createMessageEditorTextDraft({
    annotations: current.annotations,
    blockType: currentBlockType === "intro" ? "paragraph" : currentBlockType,
    content: after,
    extra: current.extra,
    messageType: currentBlockType === "intro" ? MESSAGE_TYPE.TEXT : current.messageType,
  }), afterMarks);

  const nextMessages = [...normalizedMessages];
  nextMessages.splice(index, 1, beforeMessage, nextMessage);

  return {
    messages: nextMessages,
    focus: {
      blockId: getMessageEditorBlockId(nextMessage),
      caret: 0,
    },
  };
}

function mergeMessages(
  left: MessageDraft,
  right: MessageDraft,
): MessageDraft {
  const leftContent = normalizeContent(left.content);
  const rightContent = normalizeContent(right.content);
  const offset = leftContent.length;

  return setMessageEditorInlineMarks({
    ...left,
    content: `${leftContent}${rightContent}`,
  }, [
    ...getMessageEditorInlineMarks(left),
    ...getMessageEditorInlineMarks(right).map(mark => ({
      ...mark,
      start: mark.start + offset,
      end: mark.end + offset,
    })),
  ]);
}

/**
 * 在块首执行 Backspace 合并。
 */
export function mergeMessageEditorMessageBackward(
  messages: MessageDraft[],
  blockId: string,
): MessageEditorMergeResult | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
  if (index <= 0) {
    return null;
  }

  const previous = normalizedMessages[index - 1];
  const current = normalizedMessages[index];
  if (!isMessageEditorTextMessage(previous) || !isMessageEditorTextMessage(current)) {
    return null;
  }

  const merged = mergeMessages(previous, current);
  const nextMessages = [...normalizedMessages];
  nextMessages.splice(index - 1, 2, merged);

  return {
    messages: nextMessages,
    focus: {
      blockId: getMessageEditorBlockId(merged),
      caret: normalizeContent(previous.content).length,
    },
  };
}

/**
 * 在块尾执行 Delete 合并。
 */
export function mergeMessageEditorMessageForward(
  messages: MessageDraft[],
  blockId: string,
): MessageEditorMergeResult | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
  if (index < 0 || index >= normalizedMessages.length - 1) {
    return null;
  }

  const current = normalizedMessages[index];
  const next = normalizedMessages[index + 1];
  if (!isMessageEditorTextMessage(current) || !isMessageEditorTextMessage(next)) {
    return null;
  }

  const merged = mergeMessages(current, next);
  const nextMessages = [...normalizedMessages];
  nextMessages.splice(index, 2, merged);

  return {
    messages: nextMessages,
    focus: {
      blockId: getMessageEditorBlockId(merged),
      caret: normalizeContent(current.content).length,
    },
  };
}

/**
 * 线性重排单个块。
 */
export function moveMessageEditorMessage(
  messages: MessageDraft[],
  blockId: string,
  direction: -1 | 1,
): MessageDraft[] {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= normalizedMessages.length) {
    return normalizedMessages;
  }

  const nextMessages = [...normalizedMessages];
  const [message] = nextMessages.splice(index, 1);
  nextMessages.splice(targetIndex, 0, message);
  return nextMessages;
}
