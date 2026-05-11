import type { MessageDraft } from "@/types/messageDraft";

import type { MessageEditorRegistry } from "./messageEditorRegistry";
import type { MessageEditorSelectionPoint } from "./messageEditorSelection";

import {
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  normalizeMessageEditorContent,
  previewVisibleOffsetToMessageEditorRawOffset,
} from "../model/messageEditorTransforms";

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

  return null;
}

function isElementInsideRoot(root: HTMLElement, node: Node | null): node is Element {
  const view = root.ownerDocument.defaultView;
  return Boolean(view && node instanceof view.Element && root.contains(node));
}

function resolveTextBlockIdFromNode(root: HTMLElement, node: Node | null) {
  if (!isElementInsideRoot(root, node)) {
    return null;
  }

  const blockElement = node.closest<HTMLElement>("[data-me-block-id],[data-me-block-hit]");
  return blockElement?.dataset.meBlockId ?? blockElement?.dataset.meBlockHit ?? null;
}

function buildRuntimeHitEntries(params: {
  blockRefs: ReadonlyMap<string, HTMLElement>;
  blockShellRefs: ReadonlyMap<string, HTMLElement>;
  messages: MessageDraft[];
  registry: MessageEditorRegistry;
}): RuntimeHitTestEntry[] {
  return ensureMessageEditorMessages(params.messages).flatMap((message) => {
    if (!params.registry.isTextBlock(message)) {
      return [];
    }

    const blockId = getMessageEditorBlockId(message);
    const textElement = params.blockRefs.get(blockId);
    if (!textElement) {
      return [];
    }

    const textRect = textElement.getBoundingClientRect();
    const shellRect = params.blockShellRefs.get(blockId)?.getBoundingClientRect() ?? textRect;
    return [{
      blockId,
      content: normalizeMessageEditorContent(message.content),
      shellRect,
      textElement,
      textRect,
    }];
  });
}

function resolveBoundaryOffset(entry: RuntimeHitTestEntry, clientX: number, clientY: number, edge: MessageEditorHitTestEdge) {
  const contentLength = entry.content.length;
  if (contentLength === 0) {
    return 0;
  }

  if (edge === "before" || clientY < entry.textRect.top) {
    return 0;
  }
  if (edge === "after" || clientY > entry.textRect.bottom) {
    return contentLength;
  }
  if (clientX <= entry.textRect.left) {
    return 0;
  }
  if (clientX >= entry.textRect.right) {
    return contentLength;
  }

  return null;
}

function resolvePointForEntry(entry: RuntimeHitTestEntry, clientX: number, clientY: number, edge: MessageEditorHitTestEdge): MessageEditorSelectionPoint {
  const contentLength = entry.content.length;
  const boundaryOffset = resolveBoundaryOffset(entry, clientX, clientY, edge);
  if (boundaryOffset != null) {
    return {
      blockId: entry.blockId,
      offset: boundaryOffset,
    };
  }

  const directOffset = resolveCaretOffsetFromPoint(entry.textElement, clientX, clientY);
  if (directOffset != null) {
    const rawOffset = entry.textElement.dataset.meTextMode === "preview"
      ? previewVisibleOffsetToMessageEditorRawOffset(entry.content, directOffset)
      : directOffset;
    return {
      blockId: entry.blockId,
      offset: Math.max(0, Math.min(rawOffset, contentLength)),
    };
  }

  return {
    blockId: entry.blockId,
    offset: clientX < entry.textRect.left + (entry.textRect.right - entry.textRect.left) / 2 ? 0 : contentLength,
  };
}

/**
 * 将文档面上的坐标解析成 message 文本块内的原始 content offset。
 */
export function resolveMessageEditorTextPointFromClientPosition(params: {
  blockRefs: ReadonlyMap<string, HTMLElement>;
  blockShellRefs: ReadonlyMap<string, HTMLElement>;
  clientX: number;
  clientY: number;
  messages: MessageDraft[];
  preferredBlockId?: string;
  registry: MessageEditorRegistry;
  root: HTMLElement;
}): MessageEditorSelectionPoint | null {
  const entries = buildRuntimeHitEntries(params);
  const entryByBlockId = new Map(entries.map(entry => [entry.blockId, entry] as const));

  if (params.preferredBlockId) {
    const preferredEntry = entryByBlockId.get(params.preferredBlockId);
    if (preferredEntry) {
      return resolvePointForEntry(preferredEntry, params.clientX, params.clientY, "inside");
    }
  }

  const directBlockId = resolveTextBlockIdFromNode(
    params.root,
    params.root.ownerDocument.elementFromPoint(params.clientX, params.clientY),
  );
  const directEntry = directBlockId ? entryByBlockId.get(directBlockId) : null;
  if (directEntry) {
    return resolvePointForEntry(directEntry, params.clientX, params.clientY, "inside");
  }

  const picked = pickMessageEditorTextHitEntry(entries, params.clientY);
  return picked ? resolvePointForEntry(picked.entry, params.clientX, params.clientY, picked.edge) : null;
}
