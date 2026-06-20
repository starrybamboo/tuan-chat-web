import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorRegistry } from "./messageEditorRegistry";

import {
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  isMessageEditorTextMessage,
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

export function getMessageEditorSelectableLength(message: MessageEditorMessage | undefined, registry: MessageEditorRegistry) {
  if (!message) {
    return 0;
  }
  return registry.isTextBlock(message)
    ? normalizeMessageEditorContent(message.content).length
    : 1;
}

function clampOffset(message: MessageEditorMessage | undefined, registry: MessageEditorRegistry, offset: number) {
  const selectableLength = getMessageEditorSelectableLength(message, registry);
  return Math.max(0, Math.min(offset, selectableLength));
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
 * 根据块序列和两个端点生成连续文档选区。
 * 非文本消息按一个原子对象处理，选区范围为 0..1。
 */
export function createMessageEditorSelection(
  messages: MessageEditorMessage[],
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
    offset: clampOffset(normalizedMessages[anchorIndex], registry, anchor.offset),
  };
  const normalizedFocus: MessageEditorSelectionPoint = {
    blockId: focus.blockId,
    offset: clampOffset(normalizedMessages[focusIndex], registry, focus.offset),
  };

  const ordered = comparePoints(messageIndexByBlockId, normalizedAnchor, normalizedFocus) <= 0
    ? { start: normalizedAnchor, end: normalizedFocus }
    : { start: normalizedFocus, end: normalizedAnchor };
  const startIndex = messageIndexByBlockId.get(ordered.start.blockId)!;
  const endIndex = messageIndexByBlockId.get(ordered.end.blockId)!;
  const selectedMessages = normalizedMessages.slice(startIndex, endIndex + 1);

  const segments: MessageEditorSelectionSegment[] = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const message = normalizedMessages[index];
    const blockId = getMessageEditorBlockId(message);
    const selectableLength = getMessageEditorSelectableLength(message, registry);
    const start = index === startIndex ? ordered.start.offset : 0;
    const end = index === endIndex ? ordered.end.offset : selectableLength;
    if (end > start || (startIndex !== endIndex && selectableLength === 0)) {
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
  messages: MessageEditorMessage[],
  selection: MessageEditorSelection,
): string {
  const messageByBlockId = new Map(ensureMessageEditorMessages(messages).map(message => [getMessageEditorBlockId(message), message] as const));
  return selection.blockIds.map((blockId) => {
    const message = messageByBlockId.get(blockId);
    if (!message || !isMessageEditorTextMessage(message)) {
      return "";
    }
    const content = normalizeMessageEditorContent(message.content);
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
  messages: MessageEditorMessage[],
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
  messages: MessageEditorMessage[],
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
 * 选择整个文档流。用于 Ctrl/Cmd+A，语义应覆盖文本块和原子块。
 */
export function createMessageEditorDocumentSelection(
  messages: MessageEditorMessage[],
  registry: MessageEditorRegistry,
): MessageEditorSelection | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const firstMessage = normalizedMessages[0];
  const lastMessage = normalizedMessages.at(-1);
  if (!firstMessage || !lastMessage) {
    return null;
  }

  return createMessageEditorSelection(normalizedMessages, registry, {
    blockId: getMessageEditorBlockId(firstMessage),
    offset: 0,
  }, {
    blockId: getMessageEditorBlockId(lastMessage),
    offset: getMessageEditorSelectableLength(lastMessage, registry),
  });
}

/**
 * 移动到相邻文本块的相近 offset。只在连续文本 run 内移动。
 */
export function getAdjacentMessageEditorTextBlockPoint(
  messages: MessageEditorMessage[],
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

function findMessageIndex(
  messages: MessageEditorMessage[],
  blockId: string,
) {
  return messages.findIndex(message => getMessageEditorBlockId(message) === blockId);
}

/**
 * 移动到相邻文档块。文本和原子消息都参与文档级选择。
 */
export function getAdjacentMessageEditorDocumentBlockPoint(
  messages: MessageEditorMessage[],
  registry: MessageEditorRegistry,
  point: MessageEditorSelectionPoint,
  direction: -1 | 1,
  preferredOffset = point.offset,
): MessageEditorSelectionPoint | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const currentIndex = findMessageIndex(normalizedMessages, point.blockId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= normalizedMessages.length) {
    return null;
  }

  const nextMessage = normalizedMessages[nextIndex];
  const nextLength = getMessageEditorSelectableLength(nextMessage, registry);
  if (!registry.isTextBlock(nextMessage)) {
    return {
      blockId: getMessageEditorBlockId(nextMessage),
      offset: direction < 0 ? 0 : nextLength,
    };
  }

  return {
    blockId: getMessageEditorBlockId(nextMessage),
    offset: Math.max(0, Math.min(preferredOffset, nextLength)),
  };
}

/**
 * 按字符移动连续文本光标。跨块时跳到相邻文本块的边界字符。
 */
export function moveMessageEditorTextPointByCharacter(
  messages: MessageEditorMessage[],
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

/**
 * 按文档对象移动选区端点。原子消息视为长度为 1 的整体对象。
 */
export function moveMessageEditorDocumentPointByCharacter(
  messages: MessageEditorMessage[],
  registry: MessageEditorRegistry,
  point: MessageEditorSelectionPoint,
  direction: -1 | 1,
): MessageEditorSelectionPoint | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const currentIndex = findMessageIndex(normalizedMessages, point.blockId);
  if (currentIndex < 0) {
    return null;
  }

  const currentMessage = normalizedMessages[currentIndex];
  const currentLength = getMessageEditorSelectableLength(currentMessage, registry);
  const currentOffset = Math.max(0, Math.min(point.offset, currentLength));
  const nextOffset = currentOffset + direction;
  if (nextOffset >= 0 && nextOffset <= currentLength) {
    return {
      blockId: point.blockId,
      offset: nextOffset,
    };
  }

  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= normalizedMessages.length) {
    return null;
  }

  const nextMessage = normalizedMessages[nextIndex];
  const nextLength = getMessageEditorSelectableLength(nextMessage, registry);
  return {
    blockId: getMessageEditorBlockId(nextMessage),
    offset: direction < 0 ? Math.max(0, nextLength - 1) : Math.min(1, nextLength),
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
 * 判断原生 Selection 是否为反向选择（focus 在 anchor 之前）。
 * Range 始终按文档序归一化，丢失了 anchor/focus 方向，需借助 Selection 还原。
 */
export function isNativeSelectionBackward(selection: Selection | null | undefined): boolean {
  if (!selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode) {
    return false;
  }
  const probe = document.createRange();
  try {
    probe.setStart(selection.anchorNode, selection.anchorOffset);
    probe.setEnd(selection.focusNode, selection.focusOffset);
  }
  catch {
    return false;
  }
  // setEnd 落在 setStart 之前时 Range 会塌缩，说明 focus 在 anchor 之前。
  return probe.collapsed;
}

/**
 * 从原生 Range 中解析 editor 选区。
 * backward 为 true 时表示 Range 的 end 才是 anchor、start 才是 focus，
 * 用于保留 Shift 反向选择的方向语义。
 */
export function resolveMessageEditorSelectionFromRange(
  root: HTMLElement,
  messages: MessageEditorMessage[],
  registry: MessageEditorRegistry,
  range: Range,
  backward = false,
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

  const startPoint: MessageEditorSelectionPoint = {
    blockId: startBlockId,
    offset: resolveOffset(startBlock, startBlockId, range.startContainer, range.startOffset),
  };
  const endPoint: MessageEditorSelectionPoint = {
    blockId: endBlockId,
    offset: resolveOffset(endBlock, endBlockId, range.endContainer, range.endOffset),
  };

  const anchor = backward ? endPoint : startPoint;
  const focus = backward ? startPoint : endPoint;
  return createMessageEditorSelection(messages, registry, anchor, focus);
}

/**
 * 从原生 Selection 中解析 editor 选区，自动保留 anchor/focus 方向。
 */
export function resolveMessageEditorSelectionFromNative(
  root: HTMLElement,
  messages: MessageEditorMessage[],
  registry: MessageEditorRegistry,
  selection: Selection,
): MessageEditorSelection | null {
  if (selection.rangeCount === 0) {
    return null;
  }
  return resolveMessageEditorSelectionFromRange(
    root,
    messages,
    registry,
    selection.getRangeAt(0),
    isNativeSelectionBackward(selection),
  );
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
