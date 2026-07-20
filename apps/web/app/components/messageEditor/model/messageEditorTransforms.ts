import type { WebgalChooseOption } from "@/types/webgalChoose";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { visibleOffsetToTextEnhanceRawOffset } from "@/utils/textEnhanceSyntax";

import type { MessageEditorMessage } from "../messageEditorTypes";

import { copyMessageEditorSpeakerFields } from "./messageEditorSpeaker";

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

const runtimeBlockIds = new WeakMap<object, string>();
let roomWorkingMessageIdSeed = -Math.max(1, Date.now() * 1000);

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

  return Object.keys(value).length > 0 ? { ...value } as MessageEditorExtra : undefined;
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

/** 将 source 的内存 blockId 继承给同一业务块的新对象，不写入 message payload。 */
export function inheritMessageEditorRuntimeBlockId<T extends MessageEditorMessage>(
  source: MessageEditorMessage,
  target: T,
): T {
  return inheritRuntimeBlockId(source, target);
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

function nextMessageEditorRoomWorkingId() {
  const nextId = roomWorkingMessageIdSeed;
  roomWorkingMessageIdSeed -= 1;
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
  if (typeof rawMessage.tcLocalRenderKey === "string" && rawMessage.tcLocalRenderKey.trim()) {
    runtimeFields.tcLocalRenderKey = rawMessage.tcLocalRenderKey;
  }
  if (rawMessage.tcMessageEditorDraft === true) {
    runtimeFields.tcMessageEditorDraft = true;
  }
  Object.assign(nextMessage, runtimeFields);

  return inheritRuntimeBlockId(rawMessage, nextMessage);
}

/**
 * 将房间编辑器的新块补成 chatHistory 可直接渲染的内存消息。
 * 负 ID 仅用于本地工作视图，持久化策略仍会把 tcMessageEditorDraft 作为 insert。
 */
export function materializeMessageEditorRoomWorkingMessages(
  messages: MessageEditorMessage[],
  roomId: number,
  options: { structureChanged?: boolean } = {},
) {
  const now = new Date().toISOString();
  const fallbackUserId = messages.find(message => typeof message.userId === "number")?.userId ?? 0;

  return ensureMessageEditorMessages(messages).map((message, index) => {
    const currentMessageId = typeof message.messageId === "number" && Number.isFinite(message.messageId)
      ? message.messageId
      : undefined;
    const isEditorDraft = message.tcMessageEditorDraft === true || currentMessageId === undefined || currentMessageId === 0;
    const messageId = isEditorDraft
      ? currentMessageId && currentMessageId < 0 ? currentMessageId : nextMessageEditorRoomWorkingId()
      : currentMessageId!;
    const position = options.structureChanged || typeof message.position !== "number"
      ? index + 1
      : message.position;
    const nextMessage: MessageEditorMessage = {
      ...message,
      messageId,
      syncId: typeof message.syncId === "number" && Number.isFinite(message.syncId) ? message.syncId : messageId,
      roomId,
      userId: typeof message.userId === "number" ? message.userId : fallbackUserId,
      status: typeof message.status === "number" ? message.status : 0,
      position,
      ...(isEditorDraft
        ? {
            tcLocalRenderKey: message.tcLocalRenderKey ?? `message-editor:${getMessageEditorBlockId(message)}`,
            tcLocalSyncState: "optimistic" as const,
            tcMessageEditorDraft: true,
            createTime: message.createTime ?? now,
            updateTime: now,
          }
        : {}),
    };
    return inheritMessageEditorRuntimeBlockId(message, nextMessage);
  });
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
