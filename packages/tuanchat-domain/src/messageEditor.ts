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
 * 文档视图支持的最小行内样式集合。
 */
export const MESSAGE_EDITOR_INLINE_MARK_TYPES = ["bold", "italic", "code", "highlight", "color"] as const;

/**
 * 文档视图支持的行内样式类型。
 */
export type MessageEditorInlineMarkType = (typeof MESSAGE_EDITOR_INLINE_MARK_TYPES)[number];

/**
 * 单个行内样式区间。
 * 颜色样式通过 `color` 字段补充参数，其他样式忽略该字段。
 */
export type MessageEditorInlineMark = {
  markId: string;
  type: MessageEditorInlineMarkType;
  start: number;
  end: number;
  color?: string;
};

/**
 * message editor 在 `extra.messageEditor` 下持久化的块级元数据。
 */
export type MessageEditorPayload = {
  blockId: string;
  blockType?: MessageEditorBlockType;
  inlineMarks?: MessageEditorInlineMark[];
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

function normalizeInlineMark(
  value: unknown,
  contentLength: number,
): MessageEditorInlineMark | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = value.type;
  if (
    type !== "bold"
    && type !== "italic"
    && type !== "code"
    && type !== "highlight"
    && type !== "color"
  ) {
    return null;
  }

  const rawStart = typeof value.start === "number" ? value.start : Number.NaN;
  const rawEnd = typeof value.end === "number" ? value.end : Number.NaN;
  if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) {
    return null;
  }

  const start = Math.max(0, Math.min(Math.floor(rawStart), contentLength));
  const end = Math.max(start, Math.min(Math.floor(rawEnd), contentLength));
  if (end <= start) {
    return null;
  }

  const color = type === "color" ? toTrimmedString(value.color) : undefined;
  if (type === "color" && !color) {
    return null;
  }

  return {
    markId: toTrimmedString(value.markId) ?? createMessageEditorEntityId("mark"),
    type,
    start,
    end,
    ...(color ? { color } : {}),
  };
}

/**
 * 规范化行内样式区间，移除非法范围并合并相同样式的重叠区间。
 */
export function normalizeMessageEditorInlineMarks(
  marks: MessageEditorInlineMark[] | undefined,
  contentLength: number,
): MessageEditorInlineMark[] {
  const normalized = (marks ?? [])
    .map(mark => normalizeInlineMark(mark, contentLength))
    .filter((mark): mark is MessageEditorInlineMark => mark !== null)
    .sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }
      if (left.end !== right.end) {
        return left.end - right.end;
      }
      if (left.type !== right.type) {
        return left.type.localeCompare(right.type);
      }
      return (left.color ?? "").localeCompare(right.color ?? "");
    });

  const merged: MessageEditorInlineMark[] = [];
  for (const mark of normalized) {
    const previous = merged[merged.length - 1];
    const sameStyle = previous
      && previous.type === mark.type
      && (previous.color ?? "") === (mark.color ?? "");
    if (!sameStyle || previous.end < mark.start) {
      merged.push(mark);
      continue;
    }
    previous.end = Math.max(previous.end, mark.end);
  }

  return merged;
}

/**
 * 从任意 `extra` 中提取并规范化 `messageEditor` payload。
 */
export function getMessageEditorPayload(
  rawExtra: unknown,
  contentLength = Number.MAX_SAFE_INTEGER,
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

  const inlineMarks = normalizeMessageEditorInlineMarks(
    Array.isArray(candidate.inlineMarks) ? candidate.inlineMarks as MessageEditorInlineMark[] : undefined,
    contentLength,
  );
  const blockType = normalizeBlockType(candidate.blockType, messageType);

  return {
    blockId,
    ...(blockType ? { blockType } : {}),
    ...(inlineMarks.length > 0 ? { inlineMarks } : {}),
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
    ...(payload.inlineMarks && payload.inlineMarks.length > 0 ? { inlineMarks: payload.inlineMarks } : {}),
  };
  return extra;
}
