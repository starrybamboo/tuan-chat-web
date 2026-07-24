import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { MessageEditorMessage } from "../messageEditorTypes";

import { normalizeMessageEditorContent } from "../document/messageEditorTransforms";

export const MESSAGE_EDITOR_VIRTUALIZATION_INITIAL_BLOCK_COUNT = 24;
export const MESSAGE_EDITOR_VIRTUALIZATION_FALLBACK_HEIGHT_PX = 56;
export const MESSAGE_EDITOR_VIRTUALIZATION_VIEWPORT_INCREASE_PX = {
  bottom: 840,
  top: 600,
} as const;
export const MESSAGE_EDITOR_VIRTUALIZATION_OVERSCAN_PX = {
  main: 240,
  reverse: 160,
} as const;

const MESSAGE_EDITOR_TEXT_LINE_HEIGHT_PX = 28;
const MESSAGE_EDITOR_TEXT_CHARACTERS_PER_LINE = 52;
const MESSAGE_EDITOR_MEDIA_CONTENT_WIDTH_PX = 720;
const MESSAGE_EDITOR_MEDIA_CHROME_HEIGHT_PX = 16;

export type MessageEditorVirtualBlock = {
  blockId: string;
  estimatedHeight: number;
};

export function normalizeMessageEditorVirtualBlockHeight(height: unknown) {
  return typeof height === "number" && Number.isFinite(height) && height > 0
    ? Math.max(1, Math.round(height))
    : MESSAGE_EDITOR_VIRTUALIZATION_FALLBACK_HEIGHT_PX;
}

function readPositiveNumber(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function readMediaRecord(message: MessageEditorMessage) {
  const extra = message.extra as Record<string, unknown> | undefined;
  const payload = message.messageType === MESSAGE_TYPE.IMG
    ? extra?.imageMessage
    : message.messageType === MESSAGE_TYPE.VIDEO
      ? extra?.videoMessage
      : undefined;
  return payload && typeof payload === "object"
    ? payload as Record<string, unknown>
    : undefined;
}

function estimateTextHeight(content: string) {
  const visualLineCount = content.split("\n").reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / MESSAGE_EDITOR_TEXT_CHARACTERS_PER_LINE));
  }, 0);
  return Math.max(36, visualLineCount * MESSAGE_EDITOR_TEXT_LINE_HEIGHT_PX + 8);
}

function estimateMediaHeight(message: MessageEditorMessage) {
  const media = readMediaRecord(message);
  if (!media) {
    return null;
  }

  const editorHeight = readPositiveNumber(media, "editorHeight");
  if (editorHeight) {
    return editorHeight + MESSAGE_EDITOR_MEDIA_CHROME_HEIGHT_PX;
  }

  const width = readPositiveNumber(media, "width");
  const height = readPositiveNumber(media, "height");
  if (!width || !height) {
    return null;
  }

  const editorWidth = readPositiveNumber(media, "editorWidth");
  const displayWidth = Math.min(editorWidth ?? width, MESSAGE_EDITOR_MEDIA_CONTENT_WIDTH_PX);
  return displayWidth * height / width + MESSAGE_EDITOR_MEDIA_CHROME_HEIGHT_PX;
}

/**
 * 根据业务消息估算 Virtuoso 尚未测量 block 的初始高度。
 */
export function estimateMessageEditorBlockHeight(input: {
  isTextBlock: boolean;
  message: MessageEditorMessage;
}) {
  if (input.isTextBlock) {
    return normalizeMessageEditorVirtualBlockHeight(
      estimateTextHeight(normalizeMessageEditorContent(input.message.content)),
    );
  }

  const mediaHeight = estimateMediaHeight(input.message);
  if (mediaHeight) {
    const captionHeight = normalizeMessageEditorContent(input.message.content).length > 0
      ? MESSAGE_EDITOR_TEXT_LINE_HEIGHT_PX + 12
      : 0;
    return normalizeMessageEditorVirtualBlockHeight(mediaHeight + captionHeight);
  }

  if (input.message.messageType === MESSAGE_TYPE.SOUND || input.message.messageType === MESSAGE_TYPE.FILE) {
    return 112;
  }
  if (input.message.messageType === MESSAGE_TYPE.IMG || input.message.messageType === MESSAGE_TYPE.VIDEO) {
    return 112;
  }

  return MESSAGE_EDITOR_VIRTUALIZATION_FALLBACK_HEIGHT_PX;
}

/**
 * 结构变更时优先保留同一个可见 block；若它被删除，则选择文档中最近的幸存邻居。
 */
export function resolveMessageEditorVirtualAnchorBlockId(input: {
  anchorBlockId: string;
  nextBlockIndexById: ReadonlyMap<string, number>;
  previousBlockIds: readonly string[];
}) {
  if (input.nextBlockIndexById.has(input.anchorBlockId)) {
    return input.anchorBlockId;
  }

  const previousAnchorIndex = input.previousBlockIds.indexOf(input.anchorBlockId);
  if (previousAnchorIndex < 0) {
    return null;
  }
  for (let distance = 1; distance < input.previousBlockIds.length; distance += 1) {
    const nextBlockId = input.previousBlockIds[previousAnchorIndex + distance];
    if (nextBlockId && input.nextBlockIndexById.has(nextBlockId)) {
      return nextBlockId;
    }
    const previousBlockId = input.previousBlockIds[previousAnchorIndex - distance];
    if (previousBlockId && input.nextBlockIndexById.has(previousBlockId)) {
      return previousBlockId;
    }
  }
  return null;
}
