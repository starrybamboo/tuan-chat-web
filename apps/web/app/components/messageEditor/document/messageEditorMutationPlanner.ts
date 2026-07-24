import type { MessageEditorRegistry } from "../messageEditorRegistry";
import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorSelection } from "../selection/messageEditorSelection";
import type { MessageEditorInsertBlockResult, MessageEditorSelectionTextResult } from "./messageEditorTextTransforms";

import { getAdjacentMessageEditorTextBlockPoint } from "../selection/messageEditorSelection";
import {
  insertMessageEditorBlockAtPoint,
  insertMessageEditorBlockAtSelection,
  mergeMessageEditorMessageBackward,
  mergeMessageEditorMessageForward,
  replaceMessageEditorSelectionText,
  replaceMessageEditorSelectionTextAsBlocks,
  splitMessageEditorMessage,
  transformMessageEditorSelectionText,
} from "./messageEditorTextTransforms";
import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
  normalizeMessageEditorContent,
  updateMessageEditorTextContent,
} from "./messageEditorTransforms";

type MessageEditorMutationPlannerParams = {
  getMessages: () => MessageEditorMessage[];
  registry: MessageEditorRegistry;
}

export type MessageEditorMutationKind =
  | "ensure-trailing-text-block"
  | "insert-block-at-point"
  | "insert-block-at-selection"
  | "merge-backward"
  | "merge-forward"
  | "move-block"
  | "move-block-to-index"
  | "remove-block"
  | "replace-block-kind"
  | "replace-selection-text"
  | "replace-selection-text-as-blocks"
  | "split-selection"
  | "transform-selection-text"
  | "update-block"
  | "update-text-content";

/**
 * 一次内部数据变换解析出的消息计划。
 *
 * Planner 只描述消息数组与交互结果，不携带用户意图、history 或持久化语义。
 */
export type MessageEditorMutationPlan<TResult = unknown> = {
  changed: boolean;
  changedBlockIds: string[];
  mutation: MessageEditorMutationKind;
  messages: MessageEditorMessage[];
  result: TResult;
  structureChanged: boolean;
};

/**
 * MessageEditor 内部消息事务规划器。
 */
export type MessageEditorMutationPlanner = {
  updateBlock: (blockId: string, updater: (message: MessageEditorMessage) => MessageEditorMessage) => MessageEditorMutationPlan<void>;
  updateTextContent: (blockId: string, nextContent: string) => MessageEditorMutationPlan<void>;
  splitAtSelection: (selection: MessageEditorSelection) => MessageEditorMutationPlan<{ blockId: string; caret: number } | null> | null;
  replaceSelectionText: (selection: MessageEditorSelection, replacement: string) => MessageEditorMutationPlan<MessageEditorSelectionTextResult> | null;
  replaceSelectionTextAsBlocks: (selection: MessageEditorSelection, replacement: string) => MessageEditorMutationPlan<MessageEditorSelectionTextResult> | null;
  transformSelectionText: (
    selection: MessageEditorSelection,
    transform: (selectedText: string) => string,
  ) => MessageEditorMutationPlan<MessageEditorSelectionTextResult> | null;
  insertBlockAtPoint: (
    point: { blockId: string; offset: number },
    kind: Parameters<typeof createMessageEditorBlockDraft>[0],
    options?: { createTrailingTextBlock?: boolean },
  ) => MessageEditorMutationPlan<MessageEditorInsertBlockResult> | null;
  insertBlockAtSelection: (
    selection: MessageEditorSelection,
    kind: Parameters<typeof createMessageEditorBlockDraft>[0],
    options?: { createTrailingTextBlock?: boolean },
  ) => MessageEditorMutationPlan<MessageEditorInsertBlockResult> | null;
  mergeBackward: (blockId: string) => MessageEditorMutationPlan<{ blockId: string; caret: number } | null> | null;
  mergeForward: (blockId: string) => MessageEditorMutationPlan<{ blockId: string; caret: number } | null> | null;
  moveBlock: (blockId: string, direction: -1 | 1) => MessageEditorMutationPlan<void>;
  moveBlockToIndex: (blockId: string, targetIndex: number) => MessageEditorMutationPlan<void>;
  replaceBlockWithKind: (
    blockId: string,
    kind: Parameters<typeof createMessageEditorBlockDraft>[0],
  ) => MessageEditorMutationPlan<{ blockId: string; caret: number } | null> | null;
  getAdjacentTextBlock: (
    blockId: string,
    direction: -1 | 1,
    preferredOffset?: number,
  ) => { blockId: string; caret: number } | null;
  removeBlock: (blockId: string) => MessageEditorMutationPlan<{ blockId: string; caret: number } | null> | null;
  ensureTrailingTextBlock: () => MessageEditorMutationPlan<{ blockId: string; caret: number } | null>;
};

/**
 * 文档数据变换规划器。
 *
 * 每个方法只解析下一版消息和交互结果，不触发 React state、history 或持久化。
 */
class MessageEditorDocumentMutationPlanner implements MessageEditorMutationPlanner {
  constructor(private readonly params: MessageEditorMutationPlannerParams) {}

  updateBlock(blockId: string, updater: (message: MessageEditorMessage) => MessageEditorMessage) {
    return this.updateBlockWithMutation("update-block", blockId, updater);
  }

  updateTextContent(blockId: string, nextContent: string) {
    return this.updateBlockWithMutation(
      "update-text-content",
      blockId,
      message => updateMessageEditorTextContent(message, nextContent),
    );
  }

  splitAtSelection(selection: MessageEditorSelection) {
    if (selection.multiBlock) {
      return null;
    }

    const result = splitMessageEditorMessage(this.params.getMessages(), {
      blockId: selection.start.blockId,
      selectionStart: selection.start.offset,
      selectionEnd: selection.end.offset,
    });
    return result
      ? this.createPlan("split-selection", result.messages, result.focus, {
          changedBlockIds: selection.blockIds,
          structureChanged: true,
        })
      : null;
  }

  replaceSelectionText(selection: MessageEditorSelection, replacement: string) {
    return this.createSelectionPlan(
      "replace-selection-text",
      replaceMessageEditorSelectionText(this.params.getMessages(), selection, replacement),
      selection,
    );
  }

  replaceSelectionTextAsBlocks(selection: MessageEditorSelection, replacement: string) {
    return this.createSelectionPlan(
      "replace-selection-text-as-blocks",
      replaceMessageEditorSelectionTextAsBlocks(this.params.getMessages(), selection, replacement),
      selection,
    );
  }

  transformSelectionText(selection: MessageEditorSelection, transform: (selectedText: string) => string) {
    return this.createSelectionPlan(
      "transform-selection-text",
      transformMessageEditorSelectionText(this.params.getMessages(), selection, transform),
      selection,
    );
  }

  insertBlockAtPoint(
    point: { blockId: string; offset: number },
    kind: Parameters<typeof createMessageEditorBlockDraft>[0],
    options: { createTrailingTextBlock?: boolean } = {},
  ) {
    const result = insertMessageEditorBlockAtPoint(this.params.getMessages(), {
      blockId: point.blockId,
      createTrailingTextBlock: options.createTrailingTextBlock,
      kind,
      offset: point.offset,
    });
    if (!result) {
      return null;
    }
    return this.createPlan("insert-block-at-point", result.messages, result, {
      changedBlockIds: [
        point.blockId,
        result.insertedBlockId,
        ...(result.focus ? [result.focus.blockId] : []),
      ],
      structureChanged: true,
    });
  }

  insertBlockAtSelection(
    selection: MessageEditorSelection,
    kind: Parameters<typeof createMessageEditorBlockDraft>[0],
    options: { createTrailingTextBlock?: boolean } = {},
  ) {
    const result = insertMessageEditorBlockAtSelection(this.params.getMessages(), selection, kind, options);
    if (!result) {
      return null;
    }
    return this.createPlan("insert-block-at-selection", result.messages, result, {
      changedBlockIds: [
        ...selection.blockIds,
        result.insertedBlockId,
        ...(result.focus ? [result.focus.blockId] : []),
      ],
      structureChanged: true,
    });
  }

  mergeBackward(blockId: string) {
    const result = mergeMessageEditorMessageBackward(this.params.getMessages(), blockId);
    if (!result) {
      return null;
    }
    return this.createPlan("merge-backward", result.messages, result.focus, {
      changedBlockIds: [blockId, result.focus.blockId],
      structureChanged: true,
    });
  }

  mergeForward(blockId: string) {
    const result = mergeMessageEditorMessageForward(this.params.getMessages(), blockId);
    if (!result) {
      return null;
    }
    return this.createPlan("merge-forward", result.messages, result.focus, {
      changedBlockIds: [blockId, result.focus.blockId],
      structureChanged: true,
    });
  }

  moveBlock(blockId: string, direction: -1 | 1) {
    const currentMessages = this.params.getMessages();
    const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
    return this.createMovePlan("move-block", currentMessages, blockId, index + direction);
  }

  moveBlockToIndex(blockId: string, targetIndex: number) {
    return this.createMovePlan("move-block-to-index", this.params.getMessages(), blockId, targetIndex);
  }

  replaceBlockWithKind(blockId: string, kind: Parameters<typeof createMessageEditorBlockDraft>[0]) {
    const currentMessages = this.params.getMessages();
    const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
    if (index < 0) {
      return null;
    }

    const nextBlock = createMessageEditorBlockDraft(kind, currentMessages[index]);
    const nextMessages = [...currentMessages];
    nextMessages.splice(index, 1, nextBlock);
    const focus = this.params.registry.isTextBlock(nextBlock)
      ? {
          blockId: getMessageEditorBlockId(nextBlock),
          caret: normalizeMessageEditorContent(nextBlock.content).length,
        }
      : null;
    return this.createPlan("replace-block-kind", nextMessages, focus, {
      changedBlockIds: [blockId],
      structureChanged: false,
    });
  }

  getAdjacentTextBlock(blockId: string, direction: -1 | 1, preferredOffset?: number) {
    const fallbackOffset = preferredOffset ?? (direction < 0 ? Number.MAX_SAFE_INTEGER : 0);
    const adjacentPoint = getAdjacentMessageEditorTextBlockPoint(
      this.params.getMessages(),
      this.params.registry,
      {
        blockId,
        offset: fallbackOffset,
      },
      direction,
      fallbackOffset,
    );
    if (!adjacentPoint) {
      return null;
    }

    return {
      blockId: adjacentPoint.blockId,
      caret: adjacentPoint.offset,
    };
  }

  removeBlock(blockId: string) {
    const currentMessages = this.params.getMessages();
    const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
    if (index < 0) {
      return null;
    }

    const remainingMessages = currentMessages.filter(message => getMessageEditorBlockId(message) !== blockId);
    const nextMessages = remainingMessages.length > 0 ? remainingMessages : [createMessageEditorTextDraft()];
    const focusCandidate = nextMessages.slice(index).find(message => this.params.registry.isTextBlock(message))
      ?? nextMessages.slice(0, index).findLast(message => this.params.registry.isTextBlock(message))
      ?? nextMessages[0];
    if (!focusCandidate || !this.params.registry.isTextBlock(focusCandidate)) {
      return this.createPlan("remove-block", nextMessages, null, {
        changedBlockIds: [blockId],
        structureChanged: true,
      });
    }

    return this.createPlan("remove-block", nextMessages, {
      blockId: getMessageEditorBlockId(focusCandidate),
      caret: String(focusCandidate.content ?? "").length,
    }, {
      changedBlockIds: [blockId, getMessageEditorBlockId(focusCandidate)],
      structureChanged: true,
    });
  }

  ensureTrailingTextBlock() {
    const currentMessages = this.params.getMessages();
    const lastMessage = currentMessages.at(-1);
    if (lastMessage && this.params.registry.isTextBlock(lastMessage) && String(lastMessage.content ?? "").length === 0) {
      return this.createPlan("ensure-trailing-text-block", currentMessages, {
        blockId: getMessageEditorBlockId(lastMessage),
        caret: 0,
      }, {
        changed: false,
        changedBlockIds: [],
        structureChanged: false,
      });
    }

    const nextBlock = createMessageEditorTextDraft({
      sourceMessage: lastMessage,
    });
    return this.createPlan("ensure-trailing-text-block", [...currentMessages, nextBlock], {
      blockId: getMessageEditorBlockId(nextBlock),
      caret: 0,
    }, {
      changedBlockIds: [getMessageEditorBlockId(nextBlock)],
      structureChanged: true,
    });
  }

  private createSelectionPlan(
    mutation: Extract<MessageEditorMutationKind, "replace-selection-text" | "replace-selection-text-as-blocks" | "transform-selection-text">,
    result: MessageEditorSelectionTextResult | null,
    selection: MessageEditorSelection,
  ) {
    if (!result) {
      return null;
    }
    return this.createPlan(mutation, result.messages, result, {
      changedBlockIds: selection.blockIds,
      structureChanged: result.messages.length !== this.params.getMessages().length,
    });
  }

  private createPlan<TResult>(
    mutation: MessageEditorMutationKind,
    messages: MessageEditorMessage[],
    result: TResult,
    metadata: {
      changed?: boolean;
      changedBlockIds?: string[];
      structureChanged?: boolean;
    } = {},
  ): MessageEditorMutationPlan<TResult> {
    const changed = metadata.changed ?? messages !== this.params.getMessages();
    return {
      changed,
      changedBlockIds: changed ? Array.from(new Set(metadata.changedBlockIds ?? [])) : [],
      mutation,
      messages,
      result,
      structureChanged: changed && (metadata.structureChanged ?? false),
    };
  }

  private createMovePlan(
    mutation: Extract<MessageEditorMutationKind, "move-block" | "move-block-to-index">,
    currentMessages: MessageEditorMessage[],
    blockId: string,
    targetIndex: number,
  ) {
    const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
    const normalizedTargetIndex = Math.max(0, Math.min(targetIndex, currentMessages.length - 1));
    if (index < 0 || normalizedTargetIndex === index) {
      return this.createPlan(mutation, currentMessages, undefined, {
        changed: false,
        changedBlockIds: [],
        structureChanged: false,
      });
    }

    const messages = [...currentMessages];
    const [message] = messages.splice(index, 1);
    messages.splice(normalizedTargetIndex, 0, message);
    return this.createPlan(mutation, messages, undefined, {
      changedBlockIds: [blockId],
      structureChanged: true,
    });
  }

  private updateBlockWithMutation(
    mutation: Extract<MessageEditorMutationKind, "update-block" | "update-text-content">,
    blockId: string,
    updater: (message: MessageEditorMessage) => MessageEditorMessage,
  ) {
    const currentMessages = this.params.getMessages();
    const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
    if (index < 0) {
      return this.createPlan(mutation, currentMessages, undefined, {
        changed: false,
        changedBlockIds: [],
        structureChanged: false,
      });
    }

    const nextMessage = updater(currentMessages[index]);
    if (nextMessage === currentMessages[index]) {
      return this.createPlan(mutation, currentMessages, undefined, {
        changed: false,
        changedBlockIds: [],
        structureChanged: false,
      });
    }

    const messages = [...currentMessages];
    messages[index] = nextMessage;
    return this.createPlan(mutation, messages, undefined, {
      changedBlockIds: [blockId],
      structureChanged: false,
    });
  }
}

/**
 * 创建读取当前文档快照的编辑事务规划器。
 */
export function createMessageEditorMutationPlanner(
  params: MessageEditorMutationPlannerParams,
): MessageEditorMutationPlanner {
  return new MessageEditorDocumentMutationPlanner(params);
}
