import type { MessageDraft } from "@/types/messageDraft";

import { visibleOffsetToTextEnhanceRawOffset } from "@/utils/textEnhanceSyntax";

import type { MessageEditorRegistry } from "./messageEditorRegistry";

import {
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  normalizeMessageEditorContent,
} from "../model/messageEditorTransforms";

/**
 * editor 级选区端点。
 */
export type MessageEditorSelectionPoint = {
  blockId: string;
  offset: number;
};

/**
 * 单块上的局部选区。
 */
export type MessageEditorSelectionSegment = {
  blockId: string;
  start: number;
  end: number;
};

/**
 * 归一化后的 editor 选区。
 */
export type MessageEditorSelection = {
  anchor: MessageEditorSelectionPoint;
  focus: MessageEditorSelectionPoint;
  segments: MessageEditorSelectionSegment[];
  start: MessageEditorSelectionPoint;
  end: MessageEditorSelectionPoint;
  blockIds: string[];
  multiBlock: boolean;
  collapsed: boolean;
};

function clampOffset(message: MessageDraft | undefined, offset: number) {
  const contentLength = normalizeMessageEditorContent(message?.content).length;
  return Math.max(0, Math.min(offset, contentLength));
}

function comparePoints(messageIndexByBlockId: Map<string, number>, left: MessageEditorSelectionPoint, right: MessageEditorSelectionPoint) {
  const leftIndex = messageIndexByBlockId.get(left.blockId) ?? -1;
  const rightIndex = messageIndexByBlockId.get(right.blockId) ?? -1;
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  return left.offset - right.offset;
}

/**
 * 根据块序列和两个端点生成连续文本选区。
 */
export function createMessageEditorSelection(
  messages: MessageDraft[],
  registry: MessageEditorRegistry,
  anchor: MessageEditorSelectionPoint,
  focus: MessageEditorSelectionPoint,
): MessageEditorSelection | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const messageIndexByBlockId = new Map(normalizedMessages.map((message, index) => [getMessageEditorBlockId(message), index] as const));
  const anchorIndex = messageIndexByBlockId.get(anchor.blockId);
  const focusIndex = messageIndexByBlockId.get(focus.blockId);
  if (anchorIndex == null || focusIndex == null) {
    return null;
  }

  const normalizedAnchor: MessageEditorSelectionPoint = {
    blockId: anchor.blockId,
    offset: clampOffset(normalizedMessages[anchorIndex], anchor.offset),
  };
  const normalizedFocus: MessageEditorSelectionPoint = {
    blockId: focus.blockId,
    offset: clampOffset(normalizedMessages[focusIndex], focus.offset),
  };

  const ordered = comparePoints(messageIndexByBlockId, normalizedAnchor, normalizedFocus) <= 0
    ? { start: normalizedAnchor, end: normalizedFocus }
    : { start: normalizedFocus, end: normalizedAnchor };
  const startIndex = messageIndexByBlockId.get(ordered.start.blockId)!;
  const endIndex = messageIndexByBlockId.get(ordered.end.blockId)!;
  const selectedMessages = normalizedMessages.slice(startIndex, endIndex + 1);
  if (selectedMessages.some(message => !registry.isTextBlock(message))) {
    return null;
  }

  const segments: MessageEditorSelectionSegment[] = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const message = normalizedMessages[index];
    const blockId = getMessageEditorBlockId(message);
    const contentLength = normalizeMessageEditorContent(message.content).length;
    const start = index === startIndex ? ordered.start.offset : 0;
    const end = index === endIndex ? ordered.end.offset : contentLength;
    if (end > start) {
      segments.push({
        blockId,
        start,
        end,
      });
    }
  }

  return {
    anchor: normalizedAnchor,
    focus: normalizedFocus,
    start: ordered.start,
    end: ordered.end,
    segments,
    blockIds: selectedMessages.map(message => getMessageEditorBlockId(message)),
    multiBlock: startIndex !== endIndex,
    collapsed: normalizedAnchor.blockId === normalizedFocus.blockId && normalizedAnchor.offset === normalizedFocus.offset,
  };
}

function findBlockElement(node: Node | null, root: HTMLElement): HTMLElement | null {
  if (!node) {
    return null;
  }
  const element = node instanceof HTMLElement ? node : node.parentElement;
  if (!element) {
    return null;
  }
  const block = element.closest<HTMLElement>("[data-me-block-id]");
  return block && root.contains(block) ? block : null;
}

function getOffsetWithinBlock(blockElement: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(blockElement);
  try {
    range.setEnd(container, offset);
  }
  catch {
    return normalizeMessageEditorContent(blockElement.textContent).length;
  }
  return range.toString().length;
}

/**
 * 从原生 Range 中解析 editor 选区。
 */
export function resolveMessageEditorSelectionFromRange(
  root: HTMLElement,
  messages: MessageDraft[],
  registry: MessageEditorRegistry,
  range: Range,
): MessageEditorSelection | null {
  const startBlock = findBlockElement(range.startContainer, root);
  const endBlock = findBlockElement(range.endContainer, root);
  if (!startBlock || !endBlock) {
    return null;
  }

  const startBlockId = startBlock.dataset.meBlockId;
  const endBlockId = endBlock.dataset.meBlockId;
  if (!startBlockId || !endBlockId) {
    return null;
  }
  const messageByBlockId = new Map(ensureMessageEditorMessages(messages).map(message => [getMessageEditorBlockId(message), message] as const));

  const resolveOffset = (block: HTMLElement, blockId: string, container: Node, offset: number) => {
    const visibleOffset = getOffsetWithinBlock(block, container, offset);
    if (block.dataset.meTextMode !== "preview") {
      return visibleOffset;
    }
    const content = normalizeMessageEditorContent(messageByBlockId.get(blockId)?.content);
    return visibleOffsetToTextEnhanceRawOffset(content, visibleOffset);
  };

  return createMessageEditorSelection(messages, registry, {
    blockId: startBlockId,
    offset: resolveOffset(startBlock, startBlockId, range.startContainer, range.startOffset),
  }, {
    blockId: endBlockId,
    offset: resolveOffset(endBlock, endBlockId, range.endContainer, range.endOffset),
  });
}

function findDomPositionByOffset(blockElement: HTMLElement, targetOffset: number): { node: Node; offset: number } {
  const walker = document.createTreeWalker(blockElement, NodeFilter.SHOW_TEXT);
  let traversed = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const textLength = node.textContent?.length ?? 0;
    if (traversed + textLength >= targetOffset) {
      return {
        node,
        offset: targetOffset - traversed,
      };
    }
    traversed += textLength;
  }

  return {
    node: blockElement,
    offset: blockElement.childNodes.length,
  };
}

/**
 * 将归一化选区恢复回原生 Selection。
 */
export function restoreMessageEditorSelection(root: HTMLElement, selection: MessageEditorSelection) {
  const startBlock = root.querySelector<HTMLElement>(`[data-me-block-id="${selection.start.blockId}"]`);
  const endBlock = root.querySelector<HTMLElement>(`[data-me-block-id="${selection.end.blockId}"]`);
  if (!startBlock || !endBlock) {
    return;
  }

  const nativeSelection = window.getSelection();
  if (!nativeSelection) {
    return;
  }

  const startPosition = findDomPositionByOffset(startBlock, selection.start.offset);
  const endPosition = findDomPositionByOffset(endBlock, selection.end.offset);
  const range = document.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);
  nativeSelection.removeAllRanges();
  nativeSelection.addRange(range);
}
