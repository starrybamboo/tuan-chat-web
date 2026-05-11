import type { MessageDraft } from "@/types/messageDraft";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { visibleOffsetToTextEnhanceRawOffset } from "@/utils/textEnhanceSyntax";

/**
 * 文本块拆分或合并后的聚焦位置。
 */
export type MessageEditorFocusTarget = {
  blockId: string;
  caret: number;
};

/**
 * 文本块拆分结果。
 */
export type MessageEditorSplitResult = {
  messages: MessageDraft[];
  focus: MessageEditorFocusTarget;
};

/**
 * 文本块合并结果。
 */
export type MessageEditorMergeResult = {
  messages: MessageDraft[];
  focus: MessageEditorFocusTarget;
};

export type MessageEditorTextSelectionPoint = {
  blockId: string;
  offset: number;
};

export type MessageEditorTextSelectionSegment = {
  blockId: string;
  start: number;
  end: number;
};

export type MessageEditorTextSelection = {
  end: MessageEditorTextSelectionPoint;
  segments: MessageEditorTextSelectionSegment[];
  start: MessageEditorTextSelectionPoint;
};

export type MessageEditorSelectionTextResult = {
  messages: MessageDraft[];
  focus: MessageEditorFocusTarget;
};

export type MessageEditorMarkdownBlockKind = "paragraph" | "heading1" | "heading2" | "heading3" | "bulletedList" | "numberedList" | "quote";

export type MessageEditorMarkdownPreview = {
  content: string;
  kind: MessageEditorMarkdownBlockKind;
  orderedNumber?: number;
  rawPrefixLength: number;
};

/**
 * slash 菜单可插入的块类型。只保留聊天室已有消息语义。
 */
export type MessageEditorInsertableBlockKind
  = | "paragraph"
    | "heading1"
    | "heading2"
    | "heading3"
    | "bulletedList"
    | "numberedList"
    | "quote"
    | "intro"
    | "image"
    | "file"
    | "audio"
    | "video"
    | "dice"
    | "choose";

export type MessageEditorUploadedMediaPayload = {
  fileId: number;
  fileName: string;
  mediaType: string;
  second?: number;
  size: number;
  height?: number;
  width?: number;
};

type MessageDraftExtra = NonNullable<MessageDraft["extra"]>;

const LEGACY_MESSAGE_EDITOR_EXTRA_KEY = "messageEditor";
const runtimeBlockIds = new WeakMap<object, string>();

function createMessageEditorEntityId(prefix = "block"): string {
  const randomPart = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${randomPart}`;
}

/**
 * 规范化消息注解数组。
 */
export function normalizeMessageEditorAnnotations(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const annotations = value.filter((item): item is string => {
    return typeof item === "string" && item.trim().length > 0;
  });
  return annotations.length > 0 ? annotations : undefined;
}

/**
 * 规范化文本块内容。
 */
export function normalizeMessageEditorContent(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function countRepeatedPrefix(content: string, marker: string, maxLength: number) {
  let length = 0;
  while (length < maxLength && content[length] === marker) {
    length += 1;
  }
  return length;
}

function countInlineSpaces(content: string, startIndex: number) {
  let index = startIndex;
  while (content[index] === " " || content[index] === "\t") {
    index += 1;
  }
  return index - startIndex;
}

/**
 * 解析文本块的 Markdown 块级语法。语法只存在于 content 字符串中。
 */
export function parseMessageEditorMarkdownPreview(rawContent: unknown): MessageEditorMarkdownPreview {
  const content = normalizeMessageEditorContent(rawContent);
  const headingMarkerLength = countRepeatedPrefix(content, "#", 3);
  if (headingMarkerLength > 0 && content[headingMarkerLength] !== "#") {
    const spacerLength = countInlineSpaces(content, headingMarkerLength);
    if (spacerLength > 0 || content.length === headingMarkerLength) {
      const rawPrefixLength = headingMarkerLength + spacerLength;
      return {
        content: content.slice(rawPrefixLength),
        kind: headingMarkerLength === 1 ? "heading1" : headingMarkerLength === 2 ? "heading2" : "heading3",
        rawPrefixLength,
      };
    }
  }

  const bulletMarker = content[0];
  const bulletSpacerLength = bulletMarker === "-" || bulletMarker === "*" ? countInlineSpaces(content, 1) : 0;
  if (bulletSpacerLength > 0) {
    return {
      content: content.slice(1 + bulletSpacerLength),
      kind: "bulletedList",
      rawPrefixLength: 1 + bulletSpacerLength,
    };
  }

  let digitLength = 0;
  while (digitLength < 9) {
    const char = content[digitLength] ?? "";
    if (char < "0" || char > "9") {
      break;
    }
    digitLength += 1;
  }
  const numberedDelimiter = content[digitLength];
  const numberedSpacerLength = numberedDelimiter === "." || numberedDelimiter === ")" ? countInlineSpaces(content, digitLength + 1) : 0;
  if (digitLength > 0 && numberedSpacerLength > 0) {
    return {
      content: content.slice(digitLength + 1 + numberedSpacerLength),
      kind: "numberedList",
      orderedNumber: Number(content.slice(0, digitLength)),
      rawPrefixLength: digitLength + 1 + numberedSpacerLength,
    };
  }

  const quoteSpacerLength = content[0] === ">" ? countInlineSpaces(content, 1) : 0;
  if (quoteSpacerLength > 0) {
    return {
      content: content.slice(1 + quoteSpacerLength),
      kind: "quote",
      rawPrefixLength: 1 + quoteSpacerLength,
    };
  }

  return {
    content,
    kind: "paragraph",
    rawPrefixLength: 0,
  };
}

export function previewVisibleOffsetToMessageEditorRawOffset(rawContent: unknown, visibleOffset: number): number {
  const preview = parseMessageEditorMarkdownPreview(rawContent);
  const visibleContent = preview.rawPrefixLength > 0 ? preview.content : normalizeMessageEditorContent(rawContent);
  return preview.rawPrefixLength + visibleOffsetToTextEnhanceRawOffset(visibleContent, visibleOffset);
}

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

function toMessageDraftExtra(value: unknown): MessageDraftExtra | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { [LEGACY_MESSAGE_EDITOR_EXTRA_KEY]: _legacyMessageEditor, ...extra } = value;
  return Object.keys(extra).length > 0 ? extra as MessageDraftExtra : undefined;
}

function normalizeMessageType(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : MESSAGE_TYPE.TEXT;
}

function inheritRuntimeBlockId<T extends MessageDraft>(source: unknown, target: T): T {
  const sourceId = isRecord(source) ? runtimeBlockIds.get(source) : undefined;
  const targetKey = target as unknown as object;
  runtimeBlockIds.set(targetKey, sourceId ?? runtimeBlockIds.get(targetKey) ?? createMessageEditorEntityId("block"));
  return target;
}

function assignRuntimeBlockId<T extends MessageDraft>(target: T, blockId?: string): T {
  runtimeBlockIds.set(target as unknown as object, blockId ?? createMessageEditorEntityId("block"));
  return target;
}

/**
 * 读取编辑器运行时块 ID。ID 只存在于前端内存，不写入 message/extra。
 */
export function getMessageEditorBlockId(message: MessageDraft): string {
  const key = message as unknown as object;
  const existing = runtimeBlockIds.get(key);
  if (existing) {
    return existing;
  }
  const nextId = createMessageEditorEntityId("block");
  runtimeBlockIds.set(key, nextId);
  return nextId;
}

/**
 * 将任意输入归一化为 message editor 可处理的单条消息草稿。
 */
export function normalizeMessageEditorDraft(rawMessage: unknown): MessageDraft | null {
  if (!isRecord(rawMessage)) {
    return null;
  }

  const messageType = normalizeMessageType(rawMessage.messageType);
  const content = normalizeMessageEditorContent(rawMessage.content);
  const normalizedExtra = toMessageDraftExtra(rawMessage.extra);

  const nextMessage: MessageDraft = {
    messageType,
    content,
    ...(normalizeMessageEditorAnnotations(rawMessage.annotations) ? { annotations: normalizeMessageEditorAnnotations(rawMessage.annotations) } : {}),
    ...(normalizedExtra ? { extra: normalizedExtra } : {}),
    ...(isRecord(rawMessage.webgal) ? { webgal: rawMessage.webgal as Record<string, Record<string, any>> } : {}),
    ...(typeof rawMessage.roleId === "number" ? { roleId: rawMessage.roleId } : {}),
    ...(typeof rawMessage.avatarId === "number" ? { avatarId: rawMessage.avatarId } : {}),
    ...(toTrimmedString(rawMessage.customRoleName) ? { customRoleName: toTrimmedString(rawMessage.customRoleName) } : {}),
  };

  return inheritRuntimeBlockId(rawMessage, nextMessage);
}

/**
 * 创建默认文本块。
 */
export function createMessageEditorTextDraft(overrides: {
  annotations?: string[];
  blockId?: string;
  content?: string;
  extra?: MessageDraft["extra"];
  messageType?: MessageDraft["messageType"];
} = {}): MessageDraft {
  const messageType = overrides.messageType ?? MESSAGE_TYPE.TEXT;
  const content = typeof overrides.content === "string" ? overrides.content : "";
  const extra = toMessageDraftExtra(overrides.extra);

  return assignRuntimeBlockId({
    messageType,
    content,
    ...(overrides.annotations && overrides.annotations.length > 0 ? { annotations: overrides.annotations } : {}),
    ...(extra ? { extra } : {}),
  }, overrides.blockId);
}

/**
 * 根据 slash 菜单命令创建对应的块草稿。
 */
export function createMessageEditorBlockDraft(kind: MessageEditorInsertableBlockKind): MessageDraft {
  switch (kind) {
    case "paragraph":
      return createMessageEditorTextDraft();
    case "heading1":
      return createMessageEditorTextDraft({ content: "# " });
    case "heading2":
      return createMessageEditorTextDraft({ content: "## " });
    case "heading3":
      return createMessageEditorTextDraft({ content: "### " });
    case "bulletedList":
      return createMessageEditorTextDraft({ content: "- " });
    case "numberedList":
      return createMessageEditorTextDraft({ content: "1. " });
    case "quote":
      return createMessageEditorTextDraft({ content: "> " });
    case "intro":
      return createMessageEditorTextDraft({
        messageType: MESSAGE_TYPE.INTRO_TEXT,
      });
    case "image":
      return normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.IMG,
        content: "",
        extra: {
          imageMessage: {},
        },
      })!;
    case "file":
      return normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.FILE,
        content: "",
        extra: {
          fileMessage: {},
        },
      })!;
    case "audio":
      return normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.SOUND,
        content: "",
        extra: {
          soundMessage: {},
        },
      })!;
    case "video":
      return normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.VIDEO,
        content: "",
        extra: {
          videoMessage: {},
        },
      })!;
    case "dice":
      return normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.DICE,
        content: "",
        extra: {
          diceResult: {},
        },
      })!;
    case "choose":
      return normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.WEBGAL_CHOOSE,
        content: "",
        extra: {
          webgalChoose: {
            options: [],
          },
        },
      })!;
    default:
      return createMessageEditorTextDraft();
  }
}

/**
 * 为媒体块写入上传后的资源信息。
 */
export function setMessageEditorUploadedMedia(
  message: MessageDraft,
  payload: MessageEditorUploadedMediaPayload,
): MessageDraft {
  const nextExtra = { ...(toMessageDraftExtra(message.extra) ?? {}) } as MessageDraftExtra;

  if (message.messageType === MESSAGE_TYPE.IMG) {
    nextExtra.imageMessage = {
      ...(nextExtra.imageMessage ?? {}),
      fileId: payload.fileId,
      fileName: payload.fileName,
      mediaType: payload.mediaType,
      size: payload.size,
      ...(typeof payload.width === "number" ? { width: payload.width } : {}),
      ...(typeof payload.height === "number" ? { height: payload.height } : {}),
    };
  }
  else if (message.messageType === MESSAGE_TYPE.FILE) {
    nextExtra.fileMessage = {
      ...(nextExtra.fileMessage ?? {}),
      fileId: payload.fileId,
      fileName: payload.fileName,
      mediaType: payload.mediaType,
      size: payload.size,
    };
  }
  else if (message.messageType === MESSAGE_TYPE.SOUND) {
    nextExtra.soundMessage = {
      ...(nextExtra.soundMessage ?? {}),
      fileId: payload.fileId,
      fileName: payload.fileName,
      mediaType: payload.mediaType,
      size: payload.size,
      ...(typeof payload.second === "number" ? { second: payload.second } : {}),
    };
  }
  else if (message.messageType === MESSAGE_TYPE.VIDEO) {
    nextExtra.videoMessage = {
      ...(nextExtra.videoMessage ?? {}),
      fileId: payload.fileId,
      fileName: payload.fileName,
      mediaType: payload.mediaType,
      size: payload.size,
    };
  }

  return inheritRuntimeBlockId(message, {
    ...message,
    extra: nextExtra,
  });
}

/**
 * 保证编辑器始终至少拥有一个块。
 */
export function ensureMessageEditorMessages(messages: MessageDraft[]): MessageDraft[] {
  const normalized = messages
    .map(message => normalizeMessageEditorDraft(message))
    .filter((message): message is MessageDraft => message !== null);

  return normalized.length > 0 ? normalized : [createMessageEditorTextDraft()];
}

/**
 * 判断消息是否属于 editor 内可直接文本编辑的块。
 */
export function isMessageEditorTextMessage(message: MessageDraft): boolean {
  return message.messageType === MESSAGE_TYPE.TEXT || message.messageType === MESSAGE_TYPE.INTRO_TEXT;
}

/**
 * 更新文本块内容。
 */
export function updateMessageEditorTextContent(
  message: MessageDraft,
  nextContent: string,
): MessageDraft {
  const previousContent = normalizeMessageEditorContent(message.content);
  const normalizedNextContent = normalizeMessageEditorContent(nextContent);
  if (previousContent === normalizedNextContent) {
    return message;
  }

  return inheritRuntimeBlockId(message, {
    ...message,
    content: normalizedNextContent,
  });
}

/**
 * 将消息列表序列化为稳定字符串。
 */
export function serializeMessageEditorMessages(messages: MessageDraft[]): string {
  return JSON.stringify(ensureMessageEditorMessages(messages).map((message) => {
    const content = normalizeMessageEditorContent(message.content);
    const nextExtra = toMessageDraftExtra(message.extra);
    return {
      annotations: normalizeMessageEditorAnnotations(message.annotations) ?? [],
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
  const content = normalizeMessageEditorContent(current.content);
  const selectionStart = Math.max(0, Math.min(params.selectionStart, content.length));
  const selectionEnd = Math.max(selectionStart, Math.min(params.selectionEnd, content.length));
  const before = content.slice(0, selectionStart);
  const after = content.slice(selectionEnd);

  const beforeMessage = inheritRuntimeBlockId(current, {
    ...current,
    content: before,
  });
  const nextMessage = createMessageEditorTextDraft({
    annotations: current.annotations,
    content: after,
    extra: current.extra,
    messageType: current.messageType === MESSAGE_TYPE.INTRO_TEXT ? MESSAGE_TYPE.TEXT : current.messageType,
  });

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

function clampTextOffset(message: MessageDraft, offset: number) {
  const contentLength = normalizeMessageEditorContent(message.content).length;
  return Math.max(0, Math.min(offset, contentLength));
}

function resolveTextSelectionRange(
  messages: MessageDraft[],
  selection: MessageEditorTextSelection,
) {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const startIndex = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === selection.start.blockId);
  const endIndex = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === selection.end.blockId);
  if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
    return null;
  }

  const selectedMessages = normalizedMessages.slice(startIndex, endIndex + 1);
  if (selectedMessages.some(message => !isMessageEditorTextMessage(message))) {
    return null;
  }

  return {
    endIndex,
    normalizedMessages,
    startIndex,
  };
}

/**
 * 用一段原始字符串替换 editor 级文本选区。跨块替换会合并边界块。
 */
export function replaceMessageEditorSelectionText(
  messages: MessageDraft[],
  selection: MessageEditorTextSelection,
  replacement: string,
): MessageEditorSelectionTextResult | null {
  const range = resolveTextSelectionRange(messages, selection);
  if (!range) {
    return null;
  }

  const { endIndex, normalizedMessages, startIndex } = range;
  const startMessage = normalizedMessages[startIndex];
  const endMessage = normalizedMessages[endIndex];
  const startContent = normalizeMessageEditorContent(startMessage.content);
  const endContent = normalizeMessageEditorContent(endMessage.content);
  const startOffset = clampTextOffset(startMessage, selection.start.offset);
  const endOffset = clampTextOffset(endMessage, selection.end.offset);
  const nextContent = `${startContent.slice(0, startOffset)}${replacement}${endContent.slice(endOffset)}`;
  const nextStartMessage = inheritRuntimeBlockId(startMessage, {
    ...startMessage,
    content: nextContent,
  });
  const nextMessages = [...normalizedMessages];
  nextMessages.splice(startIndex, endIndex - startIndex + 1, nextStartMessage);

  return {
    messages: nextMessages,
    focus: {
      blockId: getMessageEditorBlockId(nextStartMessage),
      caret: startOffset + replacement.length,
    },
  };
}

/**
 * 对每个选区片段分别做文本变换，用于跨块加聊天室文本增强语法时保留块结构。
 */
export function transformMessageEditorSelectionText(
  messages: MessageDraft[],
  selection: MessageEditorTextSelection,
  transform: (selectedText: string, segment: MessageEditorTextSelectionSegment) => string,
): MessageEditorSelectionTextResult | null {
  const range = resolveTextSelectionRange(messages, selection);
  if (!range) {
    return null;
  }

  const segmentByBlockId = new Map(selection.segments.map(segment => [segment.blockId, segment] as const));
  let focus: MessageEditorFocusTarget | null = null;
  const nextMessages = range.normalizedMessages.map((message, index) => {
    if (index < range.startIndex || index > range.endIndex) {
      return message;
    }

    const blockId = getMessageEditorBlockId(message);
    const segment = segmentByBlockId.get(blockId);
    if (!segment || segment.end <= segment.start) {
      return message;
    }

    const content = normalizeMessageEditorContent(message.content);
    const start = clampTextOffset(message, segment.start);
    const end = Math.max(start, clampTextOffset(message, segment.end));
    const replacement = transform(content.slice(start, end), {
      ...segment,
      end,
      start,
    });
    const nextMessage = inheritRuntimeBlockId(message, {
      ...message,
      content: `${content.slice(0, start)}${replacement}${content.slice(end)}`,
    });
    focus = {
      blockId: getMessageEditorBlockId(nextMessage),
      caret: start + replacement.length,
    };
    return nextMessage;
  });

  return focus
    ? {
        messages: nextMessages,
        focus,
      }
    : null;
}

function mergeMessages(
  left: MessageDraft,
  right: MessageDraft,
): MessageDraft {
  const leftContent = normalizeMessageEditorContent(left.content);
  const rightContent = normalizeMessageEditorContent(right.content);

  return inheritRuntimeBlockId(left, {
    ...left,
    content: `${leftContent}${rightContent}`,
  });
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
      caret: normalizeMessageEditorContent(previous.content).length,
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
      caret: normalizeMessageEditorContent(current.content).length,
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
  return moveMessageEditorMessageToIndex(normalizedMessages, blockId, targetIndex);
}

/**
 * 将单个块移动到指定索引。
 */
export function moveMessageEditorMessageToIndex(
  messages: MessageDraft[],
  blockId: string,
  targetIndex: number,
): MessageDraft[] {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
  const normalizedTargetIndex = Math.max(0, Math.min(targetIndex, normalizedMessages.length - 1));
  if (index < 0 || normalizedTargetIndex === index) {
    return normalizedMessages;
  }

  const nextMessages = [...normalizedMessages];
  const [message] = nextMessages.splice(index, 1);
  nextMessages.splice(normalizedTargetIndex, 0, message);
  return nextMessages;
}
