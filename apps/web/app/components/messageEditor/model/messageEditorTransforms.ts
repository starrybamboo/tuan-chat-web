import type { WebgalChooseOption } from "@/types/webgalChoose";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { visibleOffsetToTextEnhanceRawOffset } from "@/utils/textEnhanceSyntax";

import type { MessageEditorMessage } from "../messageEditorTypes";

import { copyMessageEditorSpeakerFields } from "./messageEditorSpeaker";

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
  messages: MessageEditorMessage[];
  focus: MessageEditorFocusTarget;
};

/**
 * 文本块合并结果。
 */
export type MessageEditorMergeResult = {
  messages: MessageEditorMessage[];
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
  messages: MessageEditorMessage[];
  focus: MessageEditorFocusTarget;
  selection: MessageEditorTextSelection;
};

export type MessageEditorInsertBlockResult = {
  focus: MessageEditorFocusTarget;
  insertedBlockId: string;
  messages: MessageEditorMessage[];
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

type MessageEditorExtra = NonNullable<MessageEditorMessage["extra"]>;
type MessageEditorMediaLayout = {
  editorHeight?: number;
  editorWidth?: number;
};

type MessageEditorMediaRecord = {
  extraKey: "imageMessage" | "videoMessage";
  payload: Record<string, unknown>;
};

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

function normalizeMessageEditorLocalSyncState(value: unknown): MessageEditorMessage["tcLocalSyncState"] {
  return value === "optimistic" ? "optimistic" : undefined;
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

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toPositiveNumber(value: unknown): number | undefined {
  const normalized = toFiniteNumber(value);
  return typeof normalized === "number" && normalized > 0 ? normalized : undefined;
}

function getNestedExtraRecord(extra: unknown, key: "imageMessage" | "videoMessage"): Record<string, unknown> | undefined {
  const record = isRecord(extra) ? extra : undefined;
  const nested = record?.[key];
  return isRecord(nested) ? nested : undefined;
}

function getMessageEditorMediaRecord(message: MessageEditorMessage): MessageEditorMediaRecord | null {
  if (message.messageType === MESSAGE_TYPE.IMG) {
    return {
      extraKey: "imageMessage",
      payload: getNestedExtraRecord(message.extra, "imageMessage") ?? {},
    };
  }
  if (message.messageType === MESSAGE_TYPE.VIDEO) {
    return {
      extraKey: "videoMessage",
      payload: getNestedExtraRecord(message.extra, "videoMessage") ?? {},
    };
  }
  return null;
}

function getMessageEditorMediaLayout(message: MessageEditorMessage): MessageEditorMediaLayout | null {
  const mediaRecord = getMessageEditorMediaRecord(message);
  if (!mediaRecord) {
    return null;
  }

  const editorWidth = toPositiveNumber(mediaRecord.payload.editorWidth);
  const editorHeight = toPositiveNumber(mediaRecord.payload.editorHeight)
    ?? (editorWidth ? toPositiveNumber(mediaRecord.payload.height) : undefined);
  return editorWidth || editorHeight
    ? {
        ...(editorWidth ? { editorWidth: Math.round(editorWidth) } : {}),
        ...(editorHeight ? { editorHeight: Math.round(editorHeight) } : {}),
      }
    : null;
}

function getMessageEditorMediaLayoutKeys(message: MessageEditorMessage, index: number): string[] {
  const mediaRecord = getMessageEditorMediaRecord(message);
  if (!mediaRecord) {
    return [];
  }

  const keys: string[] = [];
  const runtimeMessageId = toPositiveNumber((message as Record<string, unknown>).messageId);
  if (runtimeMessageId) {
    keys.push(`message:${runtimeMessageId}`);
  }

  const fileId = toPositiveNumber(mediaRecord.payload.fileId);
  const mediaType = toTrimmedString(mediaRecord.payload.mediaType) ?? "";
  if (fileId) {
    keys.push(`media:${message.messageType}:${fileId}:${mediaType}`);
  }

  keys.push(`index:${message.messageType}:${index}`);
  return keys;
}

function toMessageEditorExtra(value: unknown): MessageEditorExtra | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { [LEGACY_MESSAGE_EDITOR_EXTRA_KEY]: _legacyMessageEditor, ...extra } = value;
  return Object.keys(extra).length > 0 ? extra as MessageEditorExtra : undefined;
}

function normalizeMessageType(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : MESSAGE_TYPE.TEXT;
}

function inheritRuntimeBlockId<T extends MessageEditorMessage>(source: unknown, target: T): T {
  const sourceId = isRecord(source) ? runtimeBlockIds.get(source) : undefined;
  const targetKey = target as unknown as object;
  runtimeBlockIds.set(targetKey, sourceId ?? runtimeBlockIds.get(targetKey) ?? createMessageEditorEntityId("block"));
  return target;
}

function assignRuntimeBlockId<T extends MessageEditorMessage>(target: T, blockId?: string): T {
  runtimeBlockIds.set(target as unknown as object, blockId ?? createMessageEditorEntityId("block"));
  return target;
}

/**
 * 读取编辑器运行时块 ID。ID 只存在于前端内存，不写入 message/extra。
 */
export function getMessageEditorBlockId(message: MessageEditorMessage): string {
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
export function normalizeMessageEditorDraft(rawMessage: unknown): MessageEditorMessage | null {
  if (!isRecord(rawMessage)) {
    return null;
  }

  const messageType = normalizeMessageType(rawMessage.messageType);
  const content = normalizeMessageEditorContent(rawMessage.content);
  const normalizedExtra = toMessageEditorExtra(rawMessage.extra);
  const roleId = toPositiveNumber(rawMessage.roleId);
  const avatarId = toPositiveNumber(rawMessage.avatarId);
  const customRoleName = toTrimmedString(rawMessage.customRoleName);

  const nextMessage: MessageEditorMessage = {
    messageType,
    content,
    ...(normalizeMessageEditorAnnotations(rawMessage.annotations) ? { annotations: normalizeMessageEditorAnnotations(rawMessage.annotations) } : {}),
    ...(normalizedExtra ? { extra: normalizedExtra } : {}),
    ...(isRecord(rawMessage.webgal) ? { webgal: rawMessage.webgal as Record<string, Record<string, any>> } : {}),
    ...(roleId ? { roleId } : {}),
    ...(avatarId ? { avatarId } : {}),
    ...(customRoleName ? { customRoleName } : {}),
  };

  const runtimeFields: Record<string, unknown> = {};
  for (const key of ["messageId", "syncId", "roomId", "userId", "status", "replyMessageId", "position"] as const) {
    const value = rawMessage[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      runtimeFields[key] = value;
    }
  }
  const localSyncState = normalizeMessageEditorLocalSyncState(rawMessage.tcLocalSyncState);
  if (localSyncState) {
    runtimeFields.tcLocalSyncState = localSyncState;
  }
  if (typeof rawMessage.createTime === "string") {
    runtimeFields.createTime = rawMessage.createTime;
  }
  if (typeof rawMessage.updateTime === "string") {
    runtimeFields.updateTime = rawMessage.updateTime;
  }
  Object.assign(nextMessage, runtimeFields);

  return inheritRuntimeBlockId(rawMessage, nextMessage);
}

/**
 * 创建默认文本块。
 */
export function createMessageEditorTextDraft(overrides: {
  annotations?: string[];
  blockId?: string;
  content?: string;
  extra?: MessageEditorMessage["extra"];
  messageType?: MessageEditorMessage["messageType"];
  sourceMessage?: unknown;
} = {}): MessageEditorMessage {
  const messageType = overrides.messageType ?? MESSAGE_TYPE.TEXT;
  const content = typeof overrides.content === "string" ? overrides.content : "";
  const extra = toMessageEditorExtra(overrides.extra);

  return copyMessageEditorSpeakerFields(
    overrides.sourceMessage,
    assignRuntimeBlockId({
      messageType,
      content,
      ...(overrides.annotations && overrides.annotations.length > 0 ? { annotations: overrides.annotations } : {}),
      ...(extra ? { extra } : {}),
    }, overrides.blockId),
  );
}

/**
 * 根据 slash 菜单命令创建对应的块草稿。
 */
export function createMessageEditorBlockDraft(kind: MessageEditorInsertableBlockKind, sourceMessage?: unknown): MessageEditorMessage {
  switch (kind) {
    case "paragraph":
      return createMessageEditorTextDraft({ sourceMessage });
    case "heading1":
      return createMessageEditorTextDraft({ content: "# ", sourceMessage });
    case "heading2":
      return createMessageEditorTextDraft({ content: "## ", sourceMessage });
    case "heading3":
      return createMessageEditorTextDraft({ content: "### ", sourceMessage });
    case "bulletedList":
      return createMessageEditorTextDraft({ content: "- ", sourceMessage });
    case "numberedList":
      return createMessageEditorTextDraft({ content: "1. ", sourceMessage });
    case "quote":
      return createMessageEditorTextDraft({ content: "> ", sourceMessage });
    case "intro":
      return createMessageEditorTextDraft({
        messageType: MESSAGE_TYPE.INTRO_TEXT,
        sourceMessage,
      });
    case "image":
      return copyMessageEditorSpeakerFields(sourceMessage, normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.IMG,
        content: "",
        extra: {
          imageMessage: {},
        },
      })!);
    case "file":
      return copyMessageEditorSpeakerFields(sourceMessage, normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.FILE,
        content: "",
        extra: {
          fileMessage: {},
        },
      })!);
    case "audio":
      return copyMessageEditorSpeakerFields(sourceMessage, normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.SOUND,
        content: "",
        extra: {
          soundMessage: {},
        },
      })!);
    case "video":
      return copyMessageEditorSpeakerFields(sourceMessage, normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.VIDEO,
        content: "",
        extra: {
          videoMessage: {},
        },
      })!);
    case "dice":
      return copyMessageEditorSpeakerFields(sourceMessage, normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.DICE,
        content: "",
        extra: {
          diceResult: {},
        },
      })!);
    case "choose":
      return copyMessageEditorSpeakerFields(sourceMessage, normalizeMessageEditorDraft({
        messageType: MESSAGE_TYPE.WEBGAL_CHOOSE,
        content: "",
        extra: {
          webgalChoose: {
            options: [],
          },
        },
      })!);
    default:
      return createMessageEditorTextDraft({ sourceMessage });
  }
}

/**
 * 为媒体块写入上传后的资源信息。
 */
export function setMessageEditorUploadedMedia(
  message: MessageEditorMessage,
  payload: MessageEditorUploadedMediaPayload,
): MessageEditorMessage {
  const nextExtra = { ...toMessageEditorExtra(message.extra) } as MessageEditorExtra;
  const source = { kind: "internal", fileId: payload.fileId };

  if (message.messageType === MESSAGE_TYPE.IMG) {
    nextExtra.imageMessage = {
      ...nextExtra.imageMessage,
      source,
      fileName: payload.fileName,
      size: payload.size,
      ...(typeof payload.width === "number" ? { width: payload.width } : {}),
      ...(typeof payload.height === "number" ? { height: payload.height } : {}),
    };
  }
  else if (message.messageType === MESSAGE_TYPE.FILE) {
    nextExtra.fileMessage = {
      ...nextExtra.fileMessage,
      fileId: payload.fileId,
      fileName: payload.fileName,
      mediaType: payload.mediaType,
      size: payload.size,
    };
  }
  else if (message.messageType === MESSAGE_TYPE.SOUND) {
    nextExtra.soundMessage = {
      ...nextExtra.soundMessage,
      source,
      fileName: payload.fileName,
      size: payload.size,
      ...(typeof payload.second === "number" ? { second: payload.second } : {}),
    };
  }
  else if (message.messageType === MESSAGE_TYPE.VIDEO) {
    nextExtra.videoMessage = {
      ...nextExtra.videoMessage,
      source,
      fileName: payload.fileName,
      size: payload.size,
      ...(typeof payload.second === "number" ? { second: payload.second } : {}),
      ...(typeof payload.width === "number" ? { width: payload.width } : {}),
      ...(typeof payload.height === "number" ? { height: payload.height } : {}),
    };
  }

  return inheritRuntimeBlockId(message, {
    ...message,
    extra: nextExtra,
  });
}

/**
 * 更新媒体块在 editor 中使用的显示尺寸。
 */
export function updateMessageEditorMediaSize(
  message: MessageEditorMessage,
  size: { height: number; width: number },
): MessageEditorMessage {
  if (message.messageType !== MESSAGE_TYPE.IMG && message.messageType !== MESSAGE_TYPE.VIDEO) {
    return message;
  }

  const nextWidth = Math.max(1, Math.round(size.width));
  const nextHeight = Math.max(1, Math.round(size.height));
  const currentExtra = { ...toMessageEditorExtra(message.extra) } as MessageEditorExtra;
  const currentMediaMessage = message.messageType === MESSAGE_TYPE.IMG
    ? (getNestedExtraRecord(currentExtra, "imageMessage") ?? {})
    : (getNestedExtraRecord(currentExtra, "videoMessage") ?? {});
  if (currentMediaMessage.editorWidth === nextWidth && currentMediaMessage.editorHeight === nextHeight) {
    return message;
  }

  const nextMediaMessage = {
    ...currentMediaMessage,
    editorHeight: nextHeight,
    editorWidth: nextWidth,
  };

  const nextExtra = message.messageType === MESSAGE_TYPE.IMG
    ? {
        ...currentExtra,
        imageMessage: nextMediaMessage,
      }
    : {
        ...currentExtra,
        videoMessage: nextMediaMessage,
      };

  return inheritRuntimeBlockId(message, {
    ...message,
    extra: nextExtra,
  });
}

/**
 * 将本地文档视图的媒体布局覆盖回消息流，避免远端消息清洗掉 editor-only 尺寸后丢失缩放状态。
 */
export function mergeMessageEditorMediaLayouts(
  messages: MessageEditorMessage[],
  layoutSourceMessages: MessageEditorMessage[],
): MessageEditorMessage[] {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const layoutsByKey = new Map<string, MessageEditorMediaLayout>();

  ensureMessageEditorMessages(layoutSourceMessages).forEach((message, index) => {
    const layout = getMessageEditorMediaLayout(message);
    if (!layout) {
      return;
    }
    for (const key of getMessageEditorMediaLayoutKeys(message, index)) {
      layoutsByKey.set(key, layout);
    }
  });

  if (layoutsByKey.size === 0) {
    return normalizedMessages;
  }

  return normalizedMessages.map((message, index) => {
    const mediaRecord = getMessageEditorMediaRecord(message);
    if (!mediaRecord) {
      return message;
    }

    const layout = getMessageEditorMediaLayoutKeys(message, index)
      .map(key => layoutsByKey.get(key))
      .find((candidate): candidate is MessageEditorMediaLayout => Boolean(candidate));
    if (!layout) {
      return message;
    }

    const currentExtra = { ...toMessageEditorExtra(message.extra) } as MessageEditorExtra;
    const currentPayload = getNestedExtraRecord(currentExtra, mediaRecord.extraKey) ?? {};
    const nextPayload = {
      ...currentPayload,
      ...(layout.editorHeight ? { editorHeight: layout.editorHeight } : {}),
      ...(layout.editorWidth ? { editorWidth: layout.editorWidth } : {}),
    };
    if (
      currentPayload.editorHeight === nextPayload.editorHeight
      && currentPayload.editorWidth === nextPayload.editorWidth
    ) {
      return message;
    }

    return inheritRuntimeBlockId(message, {
      ...message,
      extra: {
        ...currentExtra,
        [mediaRecord.extraKey]: nextPayload,
      } as MessageEditorExtra,
    });
  });
}

/**
 * 更新 WebGAL 选择块的选项列表。
 */
export function setMessageEditorWebgalChooseOptions(
  message: MessageEditorMessage,
  options: WebgalChooseOption[],
): MessageEditorMessage {
  const nextExtra = { ...toMessageEditorExtra(message.extra) } as MessageEditorExtra;
  nextExtra.webgalChoose = {
    ...nextExtra.webgalChoose,
    options: options.map((option) => {
      const text = typeof option.text === "string" ? option.text : "";
      const code = typeof option.code === "string" ? option.code : "";
      return code.trim().length > 0
        ? { text, code }
        : { text };
    }),
  };

  return inheritRuntimeBlockId(message, {
    ...message,
    extra: nextExtra,
  });
}

/**
 * 写入 speaker 元数据。
 */
export function setMessageEditorSpeakerMetadata(
  message: MessageEditorMessage,
  speaker: {
    avatarId?: number | null;
    customRoleName?: string | null;
    roleId?: number | null;
  },
): MessageEditorMessage {
  return inheritRuntimeBlockId(message, {
    ...message,
    avatarId: toPositiveNumber(speaker.avatarId),
    customRoleName: toTrimmedString(speaker.customRoleName),
    roleId: toPositiveNumber(speaker.roleId),
  });
}

/**
 * 保证编辑器始终至少拥有一个块。
 */
export function ensureMessageEditorMessages(messages: MessageEditorMessage[]): MessageEditorMessage[] {
  const normalized = messages
    .map(message => normalizeMessageEditorDraft(message))
    .filter((message): message is MessageEditorMessage => message !== null);

  return normalized.length > 0 ? normalized : [createMessageEditorTextDraft()];
}

/**
 * 判断消息是否属于 editor 内可直接文本编辑的块。
 */
export function isMessageEditorTextMessage(message: MessageEditorMessage): boolean {
  return message.messageType === MESSAGE_TYPE.TEXT || message.messageType === MESSAGE_TYPE.INTRO_TEXT;
}

/**
 * 更新文本块内容。
 */
export function updateMessageEditorTextContent(
  message: MessageEditorMessage,
  nextContent: string,
): MessageEditorMessage {
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
export function serializeMessageEditorMessages(messages: MessageEditorMessage[]): string {
  return JSON.stringify(ensureMessageEditorMessages(messages).map((message) => {
    const content = normalizeMessageEditorContent(message.content);
    const nextExtra = toMessageEditorExtra(message.extra);
    return {
      annotations: normalizeMessageEditorAnnotations(message.annotations) ?? [],
      avatarId: message.avatarId ?? null,
      content,
      customRoleName: toTrimmedString(message.customRoleName) ?? "",
      extra: nextExtra ?? null,
      messageType: message.messageType ?? MESSAGE_TYPE.TEXT,
      roleId: message.roleId ?? null,
      tcLocalSyncState: normalizeMessageEditorLocalSyncState(message.tcLocalSyncState) ?? null,
      webgal: message.webgal ?? {},
    };
  }));
}

/**
 * 在当前光标位置拆分文本块。
 */
export function splitMessageEditorMessage(
  messages: MessageEditorMessage[],
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

  if (selectionStart === 0 && selectionEnd === 0) {
    const blankBeforeMessage = createMessageEditorTextDraft();
    const nextMessages = [...normalizedMessages];
    nextMessages.splice(index, 0, blankBeforeMessage);

    return {
      messages: nextMessages,
      focus: {
        blockId: getMessageEditorBlockId(current),
        caret: 0,
      },
    };
  }

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

function clampTextOffset(message: MessageEditorMessage, offset: number) {
  const contentLength = normalizeMessageEditorContent(message.content).length;
  return Math.max(0, Math.min(offset, contentLength));
}

function createTextTailAfterInsertedBlock(source: MessageEditorMessage, content = "") {
  const sourceIsText = isMessageEditorTextMessage(source);
  return createMessageEditorTextDraft({
    annotations: sourceIsText ? source.annotations : undefined,
    content,
    extra: sourceIsText ? source.extra : undefined,
    messageType: sourceIsText && source.messageType !== MESSAGE_TYPE.INTRO_TEXT ? source.messageType : MESSAGE_TYPE.TEXT,
  });
}

/**
 * 在文本光标或原子块边界插入一个块，并创建后续空文本块以便继续输入。
 */
export function insertMessageEditorBlockAtPoint(
  messages: MessageEditorMessage[],
  params: {
    blockId: string;
    kind: MessageEditorInsertableBlockKind;
    offset: number;
  },
): MessageEditorInsertBlockResult | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === params.blockId);
  if (index < 0) {
    return null;
  }

  const current = normalizedMessages[index];
  const insertedBlock = createMessageEditorBlockDraft(params.kind, current);
  const insertedBlockId = getMessageEditorBlockId(insertedBlock);
  const nextTextBlock = createTextTailAfterInsertedBlock(current);
  const nextMessages = [...normalizedMessages];

  if (!isMessageEditorTextMessage(current)) {
    const insertionIndex = params.offset <= 0 ? index : index + 1;
    nextMessages.splice(insertionIndex, 0, insertedBlock, nextTextBlock);
    return {
      focus: {
        blockId: getMessageEditorBlockId(nextTextBlock),
        caret: 0,
      },
      insertedBlockId,
      messages: nextMessages,
    };
  }

  const content = normalizeMessageEditorContent(current.content);
  const offset = clampTextOffset(current, params.offset);
  const before = content.slice(0, offset);
  const after = content.slice(offset);
  const replacement: MessageEditorMessage[] = [];

  if (before.length > 0) {
    replacement.push(updateMessageEditorTextContent(current, before));
  }

  replacement.push(insertedBlock);

  if (after.length > 0) {
    replacement.push(before.length > 0
      ? createTextTailAfterInsertedBlock(current, after)
      : updateMessageEditorTextContent(current, after));
  }
  else {
    replacement.push(nextTextBlock);
  }

  nextMessages.splice(index, 1, ...replacement);
  const focusBlock = replacement.at(-1)!;
  return {
    focus: {
      blockId: getMessageEditorBlockId(focusBlock),
      caret: 0,
    },
    insertedBlockId,
    messages: nextMessages,
  };
}

/**
 * 用一个块替换当前文档选区；折叠选区则在光标处插入。
 */
export function insertMessageEditorBlockAtSelection(
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
  kind: MessageEditorInsertableBlockKind,
): MessageEditorInsertBlockResult | null {
  if (selection.start.blockId === selection.end.blockId && selection.start.offset === selection.end.offset) {
    return insertMessageEditorBlockAtPoint(messages, {
      blockId: selection.start.blockId,
      kind,
      offset: selection.start.offset,
    });
  }

  const collapsed = replaceMessageEditorSelectionText(messages, selection, "");
  if (!collapsed) {
    return null;
  }

  return insertMessageEditorBlockAtPoint(collapsed.messages, {
    blockId: collapsed.focus.blockId,
    kind,
    offset: collapsed.focus.caret,
  });
}

function getMessageEditorSelectionOffset(message: MessageEditorMessage, offset: number) {
  if (!isMessageEditorTextMessage(message)) {
    return Math.max(0, Math.min(offset, 1));
  }
  return clampTextOffset(message, offset);
}

function resolveSelectionRange(
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
) {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const startIndex = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === selection.start.blockId);
  const endIndex = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === selection.end.blockId);
  if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
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
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
  replacement: string,
): MessageEditorSelectionTextResult | null {
  const range = resolveSelectionRange(messages, selection);
  if (!range) {
    return null;
  }

  const { endIndex, normalizedMessages, startIndex } = range;
  const startMessage = normalizedMessages[startIndex];
  const endMessage = normalizedMessages[endIndex];
  const startIsText = isMessageEditorTextMessage(startMessage);
  const endIsText = isMessageEditorTextMessage(endMessage);
  const startOffset = getMessageEditorSelectionOffset(startMessage, selection.start.offset);
  const endOffset = getMessageEditorSelectionOffset(endMessage, selection.end.offset);
  const startPrefix = startIsText
    ? normalizeMessageEditorContent(startMessage.content).slice(0, startOffset)
    : "";
  const endSuffix = endIsText
    ? normalizeMessageEditorContent(endMessage.content).slice(endOffset)
    : "";
  const nextContent = `${startPrefix}${replacement}${endSuffix}`;
  const nextMessages = [...normalizedMessages];
  const shouldInsertTextBlock = nextContent.length > 0 || startIsText || endIsText || normalizedMessages.length === endIndex - startIndex + 1;
  const nextTextMessage = shouldInsertTextBlock
    ? (startIsText
        ? inheritRuntimeBlockId(startMessage, {
            ...startMessage,
            content: nextContent,
          })
        : endIsText
          ? inheritRuntimeBlockId(endMessage, {
              ...endMessage,
              content: nextContent,
            })
          : createMessageEditorTextDraft({ content: nextContent, sourceMessage: startMessage }))
    : null;
  nextMessages.splice(startIndex, endIndex - startIndex + 1, ...(nextTextMessage ? [nextTextMessage] : []));
  const normalizedNextMessages = ensureMessageEditorMessages(nextMessages);
  const focusMessage = nextTextMessage
    ?? normalizedNextMessages[startIndex]
    ?? normalizedNextMessages[startIndex - 1]
    ?? normalizedNextMessages[0];
  const focusBlockId = getMessageEditorBlockId(focusMessage);
  const focusCaret = isMessageEditorTextMessage(focusMessage)
    ? (focusMessage === nextTextMessage ? startPrefix.length + replacement.length : normalizeMessageEditorContent(focusMessage.content).length)
    : 0;
  const replacementStartBlockId = nextTextMessage ? getMessageEditorBlockId(nextTextMessage) : focusBlockId;
  const replacementStartOffset = nextTextMessage ? startPrefix.length : focusCaret;
  const replacementEndOffset = nextTextMessage ? startPrefix.length + replacement.length : focusCaret;

  return {
    messages: normalizedNextMessages,
    focus: {
      blockId: focusBlockId,
      caret: focusCaret,
    },
    selection: {
      start: {
        blockId: replacementStartBlockId,
        offset: replacementStartOffset,
      },
      end: {
        blockId: replacementStartBlockId,
        offset: replacementEndOffset,
      },
      segments: [
        {
          blockId: replacementStartBlockId,
          start: replacementStartOffset,
          end: replacementEndOffset,
        },
      ],
    },
  };
}

function splitPastedTextIntoBlocks(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 1 && lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

/**
 * 用粘贴文本替换 editor 级文本选区；换行会拆成多个消息块。
 */
export function replaceMessageEditorSelectionTextAsBlocks(
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
  replacement: string,
): MessageEditorSelectionTextResult | null {
  const lines = splitPastedTextIntoBlocks(replacement);
  if (lines.length <= 1) {
    return replaceMessageEditorSelectionText(messages, selection, replacement);
  }

  const range = resolveSelectionRange(messages, selection);
  if (!range) {
    return null;
  }

  const { endIndex, normalizedMessages, startIndex } = range;
  const startMessage = normalizedMessages[startIndex];
  const endMessage = normalizedMessages[endIndex];
  const startIsText = isMessageEditorTextMessage(startMessage);
  const endIsText = isMessageEditorTextMessage(endMessage);
  const startOffset = getMessageEditorSelectionOffset(startMessage, selection.start.offset);
  const endOffset = getMessageEditorSelectionOffset(endMessage, selection.end.offset);
  const startPrefix = startIsText
    ? normalizeMessageEditorContent(startMessage.content).slice(0, startOffset)
    : "";
  const endSuffix = endIsText
    ? normalizeMessageEditorContent(endMessage.content).slice(endOffset)
    : "";
  const firstLine = lines[0] ?? "";
  const lastLine = lines.at(-1) ?? "";
  const replacementMessages: MessageEditorMessage[] = [
    startIsText
      ? inheritRuntimeBlockId(startMessage, {
          ...startMessage,
          content: `${startPrefix}${firstLine}`,
        })
      : createMessageEditorTextDraft({ content: `${startPrefix}${firstLine}`, sourceMessage: startMessage }),
  ];

  for (let index = 1; index < lines.length; index += 1) {
    const isLast = index === lines.length - 1;
    replacementMessages.push(createMessageEditorTextDraft({
      content: `${lines[index]}${isLast ? endSuffix : ""}`,
      messageType: MESSAGE_TYPE.TEXT,
    }));
  }

  const nextMessages = [...normalizedMessages];
  nextMessages.splice(startIndex, endIndex - startIndex + 1, ...replacementMessages);
  const focusMessage = replacementMessages.at(-1)!;
  const firstReplacementBlockId = getMessageEditorBlockId(replacementMessages[0]);
  const lastReplacementBlockId = getMessageEditorBlockId(focusMessage);
  const focusCaret = lastLine.length;

  return {
    messages: ensureMessageEditorMessages(nextMessages),
    focus: {
      blockId: lastReplacementBlockId,
      caret: focusCaret,
    },
    selection: {
      start: {
        blockId: firstReplacementBlockId,
        offset: startPrefix.length,
      },
      end: {
        blockId: lastReplacementBlockId,
        offset: focusCaret,
      },
      segments: replacementMessages.map((message, index) => {
        const blockId = getMessageEditorBlockId(message);
        if (index === 0) {
          return {
            blockId,
            start: startPrefix.length,
            end: startPrefix.length + firstLine.length,
          };
        }
        const line = lines[index] ?? "";
        return {
          blockId,
          start: 0,
          end: line.length,
        };
      }),
    },
  };
}

/**
 * 对每个选区片段分别做文本变换，用于跨块加聊天室文本增强语法时保留块结构。
 */
export function transformMessageEditorSelectionText(
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
  transform: (selectedText: string, segment: MessageEditorTextSelectionSegment) => string,
): MessageEditorSelectionTextResult | null {
  const range = resolveSelectionRange(messages, selection);
  if (!range) {
    return null;
  }

  const segmentByBlockId = new Map(selection.segments.map(segment => [segment.blockId, segment] as const));
  let focus: MessageEditorFocusTarget | null = null;
  const nextSegments: MessageEditorTextSelectionSegment[] = [];
  const nextMessages = range.normalizedMessages.map((message, index) => {
    if (index < range.startIndex || index > range.endIndex) {
      return message;
    }

    const blockId = getMessageEditorBlockId(message);
    const segment = segmentByBlockId.get(blockId);
    if (!segment || segment.end <= segment.start || !isMessageEditorTextMessage(message)) {
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
    nextSegments.push({
      blockId: getMessageEditorBlockId(nextMessage),
      start,
      end: start + replacement.length,
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
        selection: {
          start: {
            blockId: nextSegments[0].blockId,
            offset: nextSegments[0].start,
          },
          end: {
            blockId: nextSegments.at(-1)!.blockId,
            offset: nextSegments.at(-1)!.end,
          },
          segments: nextSegments,
        },
      }
    : null;
}

function mergeMessages(
  left: MessageEditorMessage,
  right: MessageEditorMessage,
): MessageEditorMessage {
  const leftContent = normalizeMessageEditorContent(left.content);
  const rightContent = normalizeMessageEditorContent(right.content);

  return inheritRuntimeBlockId(left, {
    ...left,
    content: `${leftContent}${rightContent}`,
  });
}

function removeMessageEditorMessageAt(
  messages: MessageEditorMessage[],
  removeIndex: number,
  focusMessage: MessageEditorMessage,
  caret: number,
): MessageEditorMergeResult {
  const nextMessages = [...messages];
  nextMessages.splice(removeIndex, 1);

  return {
    messages: nextMessages,
    focus: {
      blockId: getMessageEditorBlockId(focusMessage),
      caret,
    },
  };
}

/**
 * 在块首执行 Backspace 合并。
 */
export function mergeMessageEditorMessageBackward(
  messages: MessageEditorMessage[],
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

  if (normalizeMessageEditorContent(previous.content).length === 0) {
    return removeMessageEditorMessageAt(normalizedMessages, index - 1, current, 0);
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
  messages: MessageEditorMessage[],
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

  if (normalizeMessageEditorContent(current.content).length === 0) {
    return removeMessageEditorMessageAt(normalizedMessages, index, next, 0);
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
  messages: MessageEditorMessage[],
  blockId: string,
  direction: -1 | 1,
): MessageEditorMessage[] {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
  const targetIndex = index + direction;
  return moveMessageEditorMessageToIndex(normalizedMessages, blockId, targetIndex);
}

/**
 * 将单个块移动到指定索引。
 */
export function moveMessageEditorMessageToIndex(
  messages: MessageEditorMessage[],
  blockId: string,
  targetIndex: number,
): MessageEditorMessage[] {
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
