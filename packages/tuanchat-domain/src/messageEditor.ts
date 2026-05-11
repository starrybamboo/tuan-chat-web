import { MESSAGE_TYPE } from "./messageType";

/**
 * 线性 message editor 在 `message.extra` 中使用的稳定子 payload key。
 */
export const MESSAGE_EDITOR_EXTRA_KEY = "messageEditor";

/**
 * 文本块在文档视图中的块级样式类型。
 */
export const MESSAGE_EDITOR_BLOCK_TYPES = ["paragraph", "heading1", "heading2", "heading3", "intro"] as const;

/**
 * 文档视图支持的文本块样式类型。
 */
export type MessageEditorBlockType = (typeof MESSAGE_EDITOR_BLOCK_TYPES)[number];

/**
 * message editor 在 `extra.messageEditor` 下持久化的块级元数据。
 */
export type MessageEditorPayload = {
  blockId: string;
  blockType?: MessageEditorBlockType;
};

/**
 * 生成稳定的 message editor 实体 ID。
 */
export function createMessageEditorEntityId(prefix = "me"): string {
  const randomPart = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${randomPart}`;
}

/**
 * 判断消息类型是否属于 editor 内可直接文本编辑的块。
 */
export function isMessageEditorTextMessageType(messageType: number | undefined): boolean {
  return messageType === MESSAGE_TYPE.TEXT || messageType === MESSAGE_TYPE.INTRO_TEXT;
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

function normalizeBlockType(value: unknown, messageType?: number): MessageEditorBlockType | undefined {
  if (messageType === MESSAGE_TYPE.INTRO_TEXT) {
    return "intro";
  }

  return value === "heading1"
    || value === "heading2"
    || value === "heading3"
    || value === "intro"
    ? value
    : "paragraph";
}

/**
 * 从任意 `extra` 中提取并规范化 `messageEditor` payload。
 */
export function getMessageEditorPayload(
  rawExtra: unknown,
  _contentLength = Number.MAX_SAFE_INTEGER,
  messageType?: number,
): MessageEditorPayload | undefined {
  const extra = isRecord(rawExtra) ? rawExtra : {};
  const candidate = extra[MESSAGE_EDITOR_EXTRA_KEY];
  if (!isRecord(candidate)) {
    return undefined;
  }

  const blockId = toTrimmedString(candidate.blockId);
  if (!blockId) {
    return undefined;
  }

  const blockType = normalizeBlockType(candidate.blockType, messageType);

  return {
    blockId,
    ...(blockType ? { blockType } : {}),
  };
}

/**
 * 将 editor payload 写回任意 `extra`，并保留非 editor 的 typed payload。
 */
export function setMessageEditorPayload<TExtra extends Record<string, any> | undefined>(
  rawExtra: TExtra,
  payload: MessageEditorPayload | undefined,
): TExtra | Record<string, any> | undefined {
  const extra: Record<string, any> = isRecord(rawExtra) ? { ...rawExtra } : {};
  if (!payload) {
    delete extra[MESSAGE_EDITOR_EXTRA_KEY];
    return Object.keys(extra).length > 0 ? extra : undefined;
  }

  extra[MESSAGE_EDITOR_EXTRA_KEY] = {
    blockId: payload.blockId,
    ...(payload.blockType ? { blockType: payload.blockType } : {}),
  };
  return extra;
}
