import type { MessageDraft } from "@/types/messageDraft";

import type { MessageEditorRegistry } from "./messageEditorRegistry";

import {
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  normalizeMessageEditorContent,
  previewVisibleOffsetToMessageEditorRawOffset,
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
    if (end > start || (startIndex !== endIndex && contentLength === 0)) {
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

/**
 * 读取 editor 级选区对应的原始 message.content 文本。
 */
export function getMessageEditorSelectionText(
  messages: MessageDraft[],
  selection: MessageEditorSelection,
): string {
  const messageByBlockId = new Map(ensureMessageEditorMessages(messages).map(message => [getMessageEditorBlockId(message), message] as const));
  return selection.blockIds.map((blockId) => {
    const message = messageByBlockId.get(blockId);
    const content = normalizeMessageEditorContent(message?.content);
    if (blockId === selection.start.blockId && blockId === selection.end.blockId) {
      return content.slice(selection.start.offset, selection.end.offset);
    }
    if (blockId === selection.start.blockId) {
      return content.slice(selection.start.offset);
    }
    if (blockId === selection.end.blockId) {
      return content.slice(0, selection.end.offset);
    }
    return content;
  }).join("\n");
}

function findTextMessageIndex(
  messages: MessageDraft[],
  registry: MessageEditorRegistry,
  blockId: string,
) {
  const index = messages.findIndex(message => getMessageEditorBlockId(message) === blockId);
  if (index < 0 || !registry.isTextBlock(messages[index])) {
    return -1;
  }
  return index;
}

/**
 * 获取当前文本块所属的连续文本 run。遇到原子块即停止。
 */
export function createMessageEditorTextRunSelection(
  messages: MessageDraft[],
  registry: MessageEditorRegistry,
  blockId: string,
): MessageEditorSelection | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const currentIndex = findTextMessageIndex(normalizedMessages, registry, blockId);
  if (currentIndex < 0) {
    return null;
  }

  let startIndex = currentIndex;
  while (startIndex > 0 && registry.isTextBlock(normalizedMessages[startIndex - 1])) {
    startIndex -= 1;
  }

  let endIndex = currentIndex;
  while (endIndex < normalizedMessages.length - 1 && registry.isTextBlock(normalizedMessages[endIndex + 1])) {
    endIndex += 1;
  }

  const startMessage = normalizedMessages[startIndex];
  const endMessage = normalizedMessages[endIndex];
  return createMessageEditorSelection(normalizedMessages, registry, {
    blockId: getMessageEditorBlockId(startMessage),
    offset: 0,
  }, {
    blockId: getMessageEditorBlockId(endMessage),
    offset: normalizeMessageEditorContent(endMessage.content).length,
  });
}

/**
 * 移动到相邻文本块的相近 offset。只在连续文本 run 内移动。
 */
export function getAdjacentMessageEditorTextBlockPoint(
  messages: MessageDraft[],
  registry: MessageEditorRegistry,
  point: MessageEditorSelectionPoint,
  direction: -1 | 1,
  preferredOffset = point.offset,
): MessageEditorSelectionPoint | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const currentIndex = findTextMessageIndex(normalizedMessages, registry, point.blockId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= normalizedMessages.length) {
    return null;
  }

  const nextMessage = normalizedMessages[nextIndex];
  if (!registry.isTextBlock(nextMessage)) {
    return null;
  }

  const nextContentLength = normalizeMessageEditorContent(nextMessage.content).length;
  return {
    blockId: getMessageEditorBlockId(nextMessage),
    offset: Math.max(0, Math.min(preferredOffset, nextContentLength)),
  };
}

/**
 * 按字符移动连续文本光标。跨块时跳到相邻文本块的边界字符。
 */
export function moveMessageEditorTextPointByCharacter(
  messages: MessageDraft[],
  registry: MessageEditorRegistry,
  point: MessageEditorSelectionPoint,
  direction: -1 | 1,
): MessageEditorSelectionPoint | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const currentIndex = findTextMessageIndex(normalizedMessages, registry, point.blockId);
  if (currentIndex < 0) {
    return null;
  }

  const currentMessage = normalizedMessages[currentIndex];
  const currentLength = normalizeMessageEditorContent(currentMessage.content).length;
  const currentOffset = Math.max(0, Math.min(point.offset, currentLength));
  const nextOffset = currentOffset + direction;
  if (nextOffset >= 0 && nextOffset <= currentLength) {
    return {
      blockId: point.blockId,
      offset: nextOffset,
    };
  }

  const adjacent = getAdjacentMessageEditorTextBlockPoint(normalizedMessages, registry, point, direction);
  if (!adjacent) {
    return null;
  }

  const adjacentMessage = normalizedMessages.find(message => getMessageEditorBlockId(message) === adjacent.blockId);
  const adjacentLength = normalizeMessageEditorContent(adjacentMessage?.content).length;
  return {
    blockId: adjacent.blockId,
    offset: direction < 0 ? Math.max(0, adjacentLength - 1) : Math.min(1, adjacentLength),
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
    return previewVisibleOffsetToMessageEditorRawOffset(content, visibleOffset);
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

  if (targetOffset <= 0) {
    return {
      node: blockElement,
      offset: 0,
    };
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
