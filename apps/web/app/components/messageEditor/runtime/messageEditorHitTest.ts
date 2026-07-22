import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorRegistry } from "./messageEditorRegistry";
import type { MessageEditorSelectionPoint } from "./messageEditorSelection";

import {
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  normalizeMessageEditorContent,
  previewVisibleOffsetToMessageEditorRawOffset,
} from "../model/messageEditorTransforms";
import { getMessageEditorSelectableLength } from "./messageEditorSelection";

export type MessageEditorHitTestRect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export type MessageEditorHitTestEntry = {
  blockId: string;
  shellRect: MessageEditorHitTestRect;
  textRect: MessageEditorHitTestRect;
};

type MessageEditorHitTestEdge = "after" | "before" | "inside";

type MessageEditorResolvedHitEntry<TEntry extends MessageEditorHitTestEntry = MessageEditorHitTestEntry> = {
  edge: MessageEditorHitTestEdge;
  entry: TEntry;
};

type RuntimeHitTestEntry = MessageEditorHitTestEntry & {
  content: string;
  kind: "atomic" | "text";
  placeholder: boolean;
  selectableLength: number;
  textElement: HTMLElement;
};

export function pickMessageEditorTextHitEntry<TEntry extends MessageEditorHitTestEntry>(
  entries: TEntry[],
  clientY: number,
): MessageEditorResolvedHitEntry<TEntry> | null {
  const sortedEntries = [...entries].sort((left, right) => left.shellRect.top - right.shellRect.top);
  if (sortedEntries.length === 0) {
    return null;
  }

  const firstEntry = sortedEntries[0];
  if (clientY < firstEntry.shellRect.top) {
    return {
      edge: "before",
      entry: firstEntry,
    };
  }

  for (let index = 0; index < sortedEntries.length; index += 1) {
    const entry = sortedEntries[index];
    if (clientY >= entry.shellRect.top && clientY <= entry.shellRect.bottom) {
      return {
        edge: "inside",
        entry,
      };
    }

    const nextEntry = sortedEntries[index + 1];
    if (nextEntry && clientY > entry.shellRect.bottom && clientY < nextEntry.shellRect.top) {
      const middle = entry.shellRect.bottom + (nextEntry.shellRect.top - entry.shellRect.bottom) / 2;
      return clientY <= middle
        ? {
            edge: "after",
            entry,
          }
        : {
            edge: "before",
            entry: nextEntry,
          };
    }
  }

  return {
    edge: "after",
    entry: sortedEntries[sortedEntries.length - 1],
  };
}

function getOffsetWithinBlock(blockElement: HTMLElement, container: Node, offset: number) {
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

type MessageEditorCharacterRect = MessageEditorHitTestRect;

function compareCharacterRectToPoint(rect: MessageEditorCharacterRect, clientX: number, clientY: number) {
  if (clientY < rect.top) {
    return 1;
  }
  if (clientY > rect.bottom) {
    return -1;
  }
  if (clientX < rect.left) {
    return 1;
  }
  if (clientX > rect.right) {
    return -1;
  }
  return 0;
}

function getCaretDistance(rect: MessageEditorCharacterRect, caretX: number, clientX: number, clientY: number) {
  const deltaX = clientX - caretX;
  const deltaY = clientY < rect.top
    ? rect.top - clientY
    : clientY > rect.bottom
      ? clientY - rect.bottom
      : 0;
  return deltaX * deltaX + deltaY * deltaY;
}

/**
 * 在字符矩形按文档流排序的前提下，以 O(log n) 测量次数解析最近插入点。
 */
export function resolveMessageEditorCharacterOffsetFromPoint(options: {
  clientX: number;
  clientY: number;
  getCharacterRect: (offset: number) => MessageEditorCharacterRect | null;
  length: number;
}) {
  const { clientX, clientY, getCharacterRect, length } = options;
  if (length <= 0) {
    return 0;
  }

  const rectCache = new Map<number, MessageEditorCharacterRect | null>();
  const readRect = (offset: number) => {
    if (!rectCache.has(offset)) {
      rectCache.set(offset, getCharacterRect(offset));
    }
    return rectCache.get(offset) ?? null;
  };

  let low = 0;
  let high = length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const rect = readRect(middle);
    if (!rect) {
      break;
    }
    const comparison = compareCharacterRectToPoint(rect, clientX, clientY);
    if (comparison === 0) {
      return middle + (clientX > rect.left + (rect.right - rect.left) / 2 ? 1 : 0);
    }
    if (comparison < 0) {
      low = middle + 1;
    }
    else {
      high = middle - 1;
    }
  }

  let bestOffset = Math.max(0, Math.min(low, length));
  let bestDistance = Number.POSITIVE_INFINITY;
  const candidateOffsets = new Set([
    0,
    length,
    high - 1,
    high,
    high + 1,
    low - 1,
    low,
    low + 1,
  ]);
  candidateOffsets.forEach((offset) => {
    if (offset < 0 || offset > length) {
      return;
    }
    const nextRect = offset < length ? readRect(offset) : null;
    const previousRect = offset > 0 ? readRect(offset - 1) : null;
    const distance = Math.min(
      nextRect ? getCaretDistance(nextRect, nextRect.left, clientX, clientY) : Number.POSITIVE_INFINITY,
      previousRect ? getCaretDistance(previousRect, previousRect.right, clientX, clientY) : Number.POSITIVE_INFINITY,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOffset = offset;
    }
  });
  return bestOffset;
}

function collectTextNodes(node: Node, output: Text[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    output.push(node as Text);
    return;
  }
  node.childNodes.forEach(child => collectTextNodes(child, output));
}

function getRectDistance(rect: MessageEditorCharacterRect, clientX: number, clientY: number) {
  const deltaX = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
  const deltaY = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
  return deltaX * deltaX + deltaY * deltaY;
}

function resolveCaretOffsetFromTextGeometry(blockElement: HTMLElement, clientX: number, clientY: number) {
  const textNodes: Text[] = [];
  collectTextNodes(blockElement, textNodes);
  let nearestNode: Text | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  textNodes.forEach((textNode) => {
    if (!textNode.data.length) {
      return;
    }
    const range = blockElement.ownerDocument.createRange();
    range.selectNodeContents(textNode);
    Array.from(range.getClientRects()).forEach((rect) => {
      const distance = getRectDistance(rect, clientX, clientY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestNode = textNode;
      }
    });
  });
  if (!nearestNode) {
    return null;
  }

  const textNode = nearestNode as Text;
  const localOffset = resolveMessageEditorCharacterOffsetFromPoint({
    clientX,
    clientY,
    getCharacterRect(offset) {
      const range = blockElement.ownerDocument.createRange();
      range.setStart(textNode, offset);
      range.setEnd(textNode, offset + 1);
      const rect = range.getClientRects()[0];
      return rect ?? null;
    },
    length: textNode.data.length,
  });
  return getOffsetWithinBlock(blockElement, textNode, localOffset);
}

function resolveCaretOffsetFromPoint(blockElement: HTMLElement, clientX: number, clientY: number) {
  const documentWithCaretApis = blockElement.ownerDocument as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offset: number; offsetNode: Node } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  const caretPosition = documentWithCaretApis.caretPositionFromPoint?.(clientX, clientY);
  if (caretPosition && blockElement.contains(caretPosition.offsetNode)) {
    return getOffsetWithinBlock(blockElement, caretPosition.offsetNode, caretPosition.offset);
  }

  const caretRange = documentWithCaretApis.caretRangeFromPoint?.(clientX, clientY);
  if (caretRange && blockElement.contains(caretRange.startContainer)) {
    return getOffsetWithinBlock(blockElement, caretRange.startContainer, caretRange.startOffset);
  }

  return resolveCaretOffsetFromTextGeometry(blockElement, clientX, clientY);
}

function isElementInsideRoot(root: HTMLElement, node: Node | null): node is Element {
  const view = root.ownerDocument.defaultView;
  return Boolean(view && node instanceof view.Element && root.contains(node));
}

export function resolveMessageEditorBlockIdFromNode(root: HTMLElement, node: Node | null) {
  if (!isElementInsideRoot(root, node)) {
    return null;
  }

  const blockElement = node.closest<HTMLElement>("[data-me-block-id],[data-me-block-hit]");
  return blockElement?.dataset.meBlockId ?? blockElement?.dataset.meBlockHit ?? null;
}

export function resolveMessageEditorDropTarget(
  blockId: string,
  shellRect: MessageEditorHitTestRect,
  clientY: number,
) {
  return {
    targetBlockId: blockId,
    position: clientY <= shellRect.top + (shellRect.bottom - shellRect.top) / 2
      ? "before" as const
      : "after" as const,
  };
}

export function resolveMessageEditorVisibleDropTarget(
  entries: Array<{ blockId: string; rect: MessageEditorHitTestRect }>,
  clientY: number,
) {
  const sortedEntries = [...entries].sort((left, right) => left.rect.top - right.rect.top);
  const firstEntry = sortedEntries[0];
  if (!firstEntry) {
    return null;
  }
  if (clientY <= firstEntry.rect.top) {
    return {
      targetBlockId: firstEntry.blockId,
      position: "before" as const,
    };
  }

  for (let index = 0; index < sortedEntries.length; index += 1) {
    const entry = sortedEntries[index];
    if (clientY <= entry.rect.bottom) {
      return resolveMessageEditorDropTarget(entry.blockId, entry.rect, clientY);
    }
    const nextEntry = sortedEntries[index + 1];
    if (nextEntry && clientY < nextEntry.rect.top) {
      const gapMiddle = entry.rect.bottom + (nextEntry.rect.top - entry.rect.bottom) / 2;
      return clientY <= gapMiddle
        ? { targetBlockId: entry.blockId, position: "after" as const }
        : { targetBlockId: nextEntry.blockId, position: "before" as const };
    }
  }

  const lastEntry = sortedEntries[sortedEntries.length - 1];
  return {
    targetBlockId: lastEntry.blockId,
    position: "after" as const,
  };
}

type RuntimeHitTestParams = {
  blockRefs: ReadonlyMap<string, HTMLElement>;
  blockShellRefs: ReadonlyMap<string, HTMLElement>;
  blockSlotRefs?: ReadonlyMap<string, HTMLElement>;
  messageByBlockId?: ReadonlyMap<string, MessageEditorMessage>;
  messages: MessageEditorMessage[];
  registry: MessageEditorRegistry;
};

function buildRuntimeHitEntry(
  params: RuntimeHitTestParams,
  message: MessageEditorMessage,
  allowPlaceholder: boolean,
): RuntimeHitTestEntry | null {
  const blockId = getMessageEditorBlockId(message);
  const isText = params.registry.isTextBlock(message);
  const renderedShellElement = params.blockShellRefs.get(blockId);
  const shellElement = renderedShellElement ?? (allowPlaceholder ? params.blockSlotRefs?.get(blockId) : undefined);
  const textElement = params.blockRefs.get(blockId) ?? shellElement;
  if (!textElement) {
    return null;
  }

  const textRect = textElement.getBoundingClientRect();
  const shellRect = shellElement?.getBoundingClientRect() ?? textRect;
  return {
    blockId,
    content: normalizeMessageEditorContent(message.content),
    kind: isText ? "text" : "atomic",
    placeholder: !renderedShellElement && !params.blockRefs.has(blockId),
    selectableLength: getMessageEditorSelectableLength(message, params.registry),
    shellRect,
    textElement,
    textRect,
  };
}

function findRuntimeHitEntry(params: RuntimeHitTestParams, blockId: string) {
  const message = params.messageByBlockId?.get(blockId)
    ?? params.messages.find(item => getMessageEditorBlockId(item) === blockId);
  return message ? buildRuntimeHitEntry(params, message, true) : null;
}

function buildRuntimeHitEntries(params: RuntimeHitTestParams): RuntimeHitTestEntry[] {
  const messageByBlockId = params.messageByBlockId
    ?? new Map(ensureMessageEditorMessages(params.messages).map(message => [getMessageEditorBlockId(message), message] as const));
  const mountedBlockIds = params.blockSlotRefs?.keys() ?? params.blockShellRefs.keys();
  const entries: RuntimeHitTestEntry[] = [];
  for (const blockId of mountedBlockIds) {
    const message = messageByBlockId.get(blockId);
    if (!message) {
      continue;
    }
    const entry = buildRuntimeHitEntry(params, message, false);
    if (entry) {
      entries.push(entry);
    }
  }
  return entries;
}

function resolveBoundaryOffset(entry: RuntimeHitTestEntry, clientX: number, clientY: number, edge: MessageEditorHitTestEdge) {
  const selectableLength = entry.selectableLength;
  if (selectableLength === 0) {
    return 0;
  }

  if (edge === "before" || clientY < entry.textRect.top) {
    return 0;
  }
  if (edge === "after" || clientY > entry.textRect.bottom) {
    return selectableLength;
  }
  if (clientX <= entry.textRect.left) {
    return 0;
  }
  if (clientX >= entry.textRect.right) {
    return selectableLength;
  }

  return null;
}

function resolvePointForEntry(entry: RuntimeHitTestEntry, clientX: number, clientY: number, edge: MessageEditorHitTestEdge): MessageEditorSelectionPoint {
  const selectableLength = entry.selectableLength;
  const boundaryOffset = resolveBoundaryOffset(entry, clientX, clientY, edge);
  if (boundaryOffset != null) {
    return {
      blockId: entry.blockId,
      offset: boundaryOffset,
    };
  }

  if (entry.placeholder) {
    return {
      blockId: entry.blockId,
      offset: clientY < entry.shellRect.top + (entry.shellRect.bottom - entry.shellRect.top) / 2 ? 0 : selectableLength,
    };
  }

  if (entry.kind === "atomic") {
    return {
      blockId: entry.blockId,
      offset: clientY < entry.shellRect.top + (entry.shellRect.bottom - entry.shellRect.top) / 2 ? 0 : selectableLength,
    };
  }

  const directOffset = resolveCaretOffsetFromPoint(entry.textElement, clientX, clientY);
  if (directOffset != null) {
    const rawOffset = entry.textElement.dataset.meTextMode === "preview"
      ? previewVisibleOffsetToMessageEditorRawOffset(entry.content, directOffset)
      : directOffset;
    return {
      blockId: entry.blockId,
      offset: Math.max(0, Math.min(rawOffset, selectableLength)),
    };
  }

  return {
    blockId: entry.blockId,
    offset: clientX < entry.textRect.left + (entry.textRect.right - entry.textRect.left) / 2 ? 0 : selectableLength,
  };
}

/**
 * 将文档面上的坐标解析成 message 文本块内的原始 content offset。
 */
export function resolveMessageEditorTextPointFromClientPosition(params: {
  blockRefs: ReadonlyMap<string, HTMLElement>;
  blockShellRefs: ReadonlyMap<string, HTMLElement>;
  blockSlotRefs?: ReadonlyMap<string, HTMLElement>;
  clientX: number;
  clientY: number;
  messageByBlockId?: ReadonlyMap<string, MessageEditorMessage>;
  messages: MessageEditorMessage[];
  preferredBlockId?: string;
  registry: MessageEditorRegistry;
  root: HTMLElement;
}): MessageEditorSelectionPoint | null {
  if (params.preferredBlockId) {
    const preferredEntry = findRuntimeHitEntry(params, params.preferredBlockId);
    if (preferredEntry) {
      return resolvePointForEntry(preferredEntry, params.clientX, params.clientY, "inside");
    }
  }

  const directBlockId = resolveMessageEditorBlockIdFromNode(
    params.root,
    params.root.ownerDocument.elementFromPoint(params.clientX, params.clientY),
  );
  const directEntry = directBlockId ? findRuntimeHitEntry(params, directBlockId) : null;
  if (directEntry) {
    return resolvePointForEntry(directEntry, params.clientX, params.clientY, "inside");
  }

  const entries = buildRuntimeHitEntries(params);
  const picked = pickMessageEditorTextHitEntry(entries, params.clientY);
  return picked ? resolvePointForEntry(picked.entry, params.clientX, params.clientY, picked.edge) : null;
}
