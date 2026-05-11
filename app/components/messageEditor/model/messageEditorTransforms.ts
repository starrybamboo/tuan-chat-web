import type { MessageDraft } from "@/types/messageDraft";
import type {
  MessageEditorBlockType,
  MessageEditorInlineMark,
  MessageEditorInlineMarkType,
  MessageEditorPayload,
} from "@tuanchat/domain";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import {
  createMessageEditorEntityId,
  getMessageEditorPayload,
  isMessageEditorTextMessageType,
  normalizeMessageEditorInlineMarks,
  setMessageEditorPayload,
} from "@tuanchat/domain";

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

/**
 * slash 菜单可插入的块类型。
 */
export type MessageEditorInsertableBlockKind
  = | "paragraph"
    | "heading1"
    | "heading2"
    | "heading3"
    | "intro"
    | "image"
    | "file"
    | "audio"
    | "video"
    | "dice"
    | "choose";

type MessageDraftExtra = NonNullable<MessageDraft["extra"]>;

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

/**
 * 将任意输入归一化为 message editor 可处理的单条消息草稿。
 */
export function normalizeMessageEditorDraft(rawMessage: unknown): MessageDraft | null {
  if (!isRecord(rawMessage)) {
    return null;
  }

  const messageType = normalizeMessageType(rawMessage.messageType);
  const content = normalizeMessageEditorContent(rawMessage.content);
  const extra = toMessageDraftExtra(rawMessage.extra);
  const payload = normalizeEditorPayload(extra, content, messageType);
  const normalizedExtra = setMessageEditorPayload(extra, payload) as MessageDraft["extra"] | undefined;

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

  if (messageType === MESSAGE_TYPE.INTRO_TEXT) {
    nextMessage.extra = setMessageEditorPayload(nextMessage.extra, {
      ...payload,
      blockType: "intro",
    }) as MessageDraft["extra"];
  }

  return nextMessage;
}

/**
 * 创建默认文本块。
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
 * 根据 slash 菜单命令创建对应的块草稿。
 */
export function createMessageEditorBlockDraft(kind: MessageEditorInsertableBlockKind): MessageDraft {
  switch (kind) {
    case "paragraph":
    case "heading1":
    case "heading2":
    case "heading3":
    case "intro":
      return createMessageEditorTextDraft({
        blockType: kind,
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
 * 保证编辑器始终至少拥有一个块。
 */
export function ensureMessageEditorMessages(messages: MessageDraft[]): MessageDraft[] {
  const normalized = messages
    .map(message => normalizeMessageEditorDraft(message))
    .filter((message): message is MessageDraft => message !== null);

  return normalized.length > 0 ? normalized : [createMessageEditorTextDraft()];
}

/**
 * 读取块级稳定 ID。
 */
export function getMessageEditorBlockId(message: MessageDraft): string {
  return normalizeEditorPayload(message.extra, normalizeMessageEditorContent(message.content), message.messageType).blockId;
}

/**
 * 读取块级样式类型。
 */
export function getMessageEditorBlockType(message: MessageDraft): MessageEditorBlockType {
  return normalizeBlockType(message.messageType, getMessageEditorPayload(message.extra, normalizeMessageEditorContent(message.content).length, message.messageType));
}

/**
 * 设置块级样式，并同步 intro/text 的 messageType。
 */
export function setMessageEditorBlockType(
  message: MessageDraft,
  blockType: MessageEditorBlockType,
): MessageDraft {
  const content = normalizeMessageEditorContent(message.content);
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
 * 判断消息是否属于 editor 内可直接文本编辑的块。
 */
export function isMessageEditorTextMessage(message: MessageDraft): boolean {
  return isMessageEditorTextMessageType(message.messageType);
}

/**
 * 读取单块全部行内标记。
 */
export function getMessageEditorInlineMarks(message: MessageDraft): MessageEditorInlineMark[] {
  return normalizeEditorPayload(
    message.extra,
    normalizeMessageEditorContent(message.content),
    message.messageType,
  ).inlineMarks ?? [];
}

/**
 * 写回单块全部行内标记。
 */
export function setMessageEditorInlineMarks(
  message: MessageDraft,
  marks: MessageEditorInlineMark[],
): MessageDraft {
  const content = normalizeMessageEditorContent(message.content);
  const payload = normalizeEditorPayload(message.extra, content, message.messageType);

  return {
    ...message,
    extra: setMessageEditorPayload(message.extra, {
      ...payload,
      inlineMarks: normalizeMessageEditorInlineMarks(marks, content.length),
    }) as MessageDraft["extra"],
  };
}

function transformOffset(start: number, removedEnd: number, insertedLength: number, offset: number, isEnd: boolean): number {
  if (offset < start) {
    return offset;
  }
  if (offset > removedEnd) {
    return offset + insertedLength - (removedEnd - start);
  }
  if (removedEnd === start) {
    return start + insertedLength;
  }
  return isEnd ? start + insertedLength : start;
}

/**
 * 按单次连续文本变更调整行内标记位置。
 */
export function remapMessageEditorInlineMarksForTextChange(
  marks: MessageEditorInlineMark[],
  previousContent: string,
  nextContent: string,
): MessageEditorInlineMark[] {
  if (previousContent === nextContent) {
    return normalizeMessageEditorInlineMarks(marks, nextContent.length);
  }

  let prefix = 0;
  const maxPrefix = Math.min(previousContent.length, nextContent.length);
  while (prefix < maxPrefix && previousContent[prefix] === nextContent[prefix]) {
    prefix += 1;
  }

  let previousSuffix = previousContent.length;
  let nextSuffix = nextContent.length;
  while (previousSuffix > prefix && nextSuffix > prefix && previousContent[previousSuffix - 1] === nextContent[nextSuffix - 1]) {
    previousSuffix -= 1;
    nextSuffix -= 1;
  }

  const removedEnd = previousSuffix;
  const insertedLength = nextSuffix - prefix;

  return normalizeMessageEditorInlineMarks(marks.map(mark => ({
    ...mark,
    start: transformOffset(prefix, removedEnd, insertedLength, mark.start, false),
    end: transformOffset(prefix, removedEnd, insertedLength, mark.end, true),
  })), nextContent.length);
}

/**
 * 更新文本块内容，并同步修正行内标记位置。
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

  return setMessageEditorInlineMarks({
    ...message,
    content: normalizedNextContent,
  }, remapMessageEditorInlineMarksForTextChange(
    getMessageEditorInlineMarks(message),
    previousContent,
    normalizedNextContent,
  ));
}

/**
 * 判断给定范围是否已被指定类型的 mark 完整覆盖。
 */
export function isMessageEditorInlineMarkFullyCovered(
  message: MessageDraft,
  params: {
    type: MessageEditorInlineMarkType;
    start: number;
    end: number;
  },
): boolean {
  const content = normalizeMessageEditorContent(message.content);
  const start = Math.max(0, Math.min(params.start, content.length));
  const end = Math.max(start, Math.min(params.end, content.length));
  if (end <= start) {
    return false;
  }

  return getMessageEditorInlineMarks(message).some((mark) => {
    return mark.type === params.type && mark.start <= start && mark.end >= end;
  });
}

function removeInlineMarkRange(
  message: MessageDraft,
  params: {
    type: MessageEditorInlineMarkType;
    start: number;
    end: number;
  },
): MessageDraft {
  const start = params.start;
  const end = params.end;

  return setMessageEditorInlineMarks(message, getMessageEditorInlineMarks(message).flatMap((mark) => {
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

/**
 * 以显式 active 状态设置非颜色类 mark。
 */
export function setMessageEditorInlineMarkActive(
  message: MessageDraft,
  params: {
    active: boolean;
    type: Exclude<MessageEditorInlineMarkType, "color">;
    start: number;
    end: number;
  },
): MessageDraft {
  const content = normalizeMessageEditorContent(message.content);
  const start = Math.max(0, Math.min(params.start, content.length));
  const end = Math.max(start, Math.min(params.end, content.length));
  if (end <= start) {
    return message;
  }

  if (!params.active) {
    return removeInlineMarkRange(message, {
      type: params.type,
      start,
      end,
    });
  }

  if (isMessageEditorInlineMarkFullyCovered(message, {
    type: params.type,
    start,
    end,
  })) {
    return message;
  }

  return setMessageEditorInlineMarks(message, [
    ...getMessageEditorInlineMarks(message),
    {
      markId: createMessageEditorEntityId("mark"),
      type: params.type,
      start,
      end,
    },
  ]);
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
  const active = !isMessageEditorInlineMarkFullyCovered(message, params);
  return setMessageEditorInlineMarkActive(message, {
    ...params,
    active,
  });
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
  const content = normalizeMessageEditorContent(message.content);
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
 * 将消息列表序列化为稳定字符串。
 */
export function serializeMessageEditorMessages(messages: MessageDraft[]): string {
  return JSON.stringify(ensureMessageEditorMessages(messages).map((message) => {
    const content = normalizeMessageEditorContent(message.content);
    const payload = normalizeEditorPayload(message.extra, content, message.messageType);
    const nextExtra = setMessageEditorPayload(message.extra, payload);
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
  const leftContent = normalizeMessageEditorContent(left.content);
  const rightContent = normalizeMessageEditorContent(right.content);
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
