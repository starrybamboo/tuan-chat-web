import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorInsertBlockResult, MessageEditorSelectionTextResult } from "../model/messageEditorTransforms";
import type { MessageEditorEventBus } from "./messageEditorEventBus";
import type { MessageEditorRegistry } from "./messageEditorRegistry";
import type { MessageEditorSelection } from "./messageEditorSelection";

import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  insertMessageEditorBlockAtPoint,
  insertMessageEditorBlockAtSelection,
  mergeMessageEditorMessageBackward,
  mergeMessageEditorMessageForward,
  moveMessageEditorMessage,
  moveMessageEditorMessageToIndex,
  normalizeMessageEditorContent,
  replaceMessageEditorSelectionTextAsBlocks,
  replaceMessageEditorSelectionText,
  splitMessageEditorMessage,
  transformMessageEditorSelectionText,
  updateMessageEditorTextContent,
} from "../model/messageEditorTransforms";

type SetMessages = (
  updater: (previous: MessageEditorMessage[]) => MessageEditorMessage[],
  historyKind?: "default" | "typing",
) => void;

type MessageEditorControllerParams = {
  eventBus?: MessageEditorEventBus;
  getMessages: () => MessageEditorMessage[];
  registry: MessageEditorRegistry;
  setMessages: SetMessages;
}

/**
 * message editor 命令控制器。
 */
export type MessageEditorController = {
  setActiveBlock: (blockId: string | null) => void;
  updateBlock: (blockId: string, updater: (message: MessageEditorMessage) => MessageEditorMessage) => void;
  updateTextContent: (blockId: string, nextContent: string) => void;
  splitAtSelection: (selection: MessageEditorSelection) => { blockId: string; caret: number } | null;
  replaceSelectionText: (selection: MessageEditorSelection, replacement: string) => MessageEditorSelectionTextResult | null;
  replaceSelectionTextAsBlocks: (selection: MessageEditorSelection, replacement: string) => MessageEditorSelectionTextResult | null;
  transformSelectionText: (
    selection: MessageEditorSelection,
    transform: (selectedText: string) => string,
  ) => MessageEditorSelectionTextResult | null;
  insertBlockAtPoint: (
    point: { blockId: string; offset: number },
    kind: Parameters<typeof createMessageEditorBlockDraft>[0],
  ) => MessageEditorInsertBlockResult | null;
  insertBlockAtSelection: (
    selection: MessageEditorSelection,
    kind: Parameters<typeof createMessageEditorBlockDraft>[0],
  ) => MessageEditorInsertBlockResult | null;
  mergeBackward: (blockId: string) => { blockId: string; caret: number } | null;
  mergeForward: (blockId: string) => { blockId: string; caret: number } | null;
  moveBlock: (blockId: string, direction: -1 | 1) => void;
  moveBlockToIndex: (blockId: string, targetIndex: number) => void;
  replaceBlockWithKind: (
    blockId: string,
    kind: Parameters<typeof createMessageEditorBlockDraft>[0],
  ) => { blockId: string; caret: number } | null;
  getAdjacentTextBlock: (
    blockId: string,
    direction: -1 | 1,
    preferredOffset?: number,
  ) => { blockId: string; caret: number } | null;
  removeBlock: (blockId: string) => { blockId: string; caret: number } | null;
  ensureTrailingTextBlock: () => { blockId: string; caret: number } | null;
};

/**
 * 文档命令运行时。
 *
 * 这个类集中维护 controller 级 invariant：所有消息变更都通过 commitMessages 触发
 * blocksChanged，文本输入使用 typing historyKind，active block 只广播运行时事件。
 */
class MessageEditorDocumentController implements MessageEditorController {
  constructor(private readonly params: MessageEditorControllerParams) {}

  setActiveBlock(blockId: string | null) {
    this.params.eventBus?.emit("activeBlockChanged", { blockId });
  }

  updateBlock(blockId: string, updater: (message: MessageEditorMessage) => MessageEditorMessage) {
    this.commitMessages((previous) => {
      return ensureMessageEditorMessages(previous).map((message) => {
        return getMessageEditorBlockId(message) === blockId ? updater(message) : message;
      });
    });
  }

  updateTextContent(blockId: string, nextContent: string) {
    this.commitMessages((previous) => {
      return ensureMessageEditorMessages(previous).map((message) => {
        return getMessageEditorBlockId(message) === blockId
          ? updateMessageEditorTextContent(message, nextContent)
          : message;
      });
    }, "typing");
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
    this.commitResolvedMessages(result.messages);
    return result.focus;
  }

  replaceSelectionText(selection: MessageEditorSelection, replacement: string) {
    return this.commitSelectionResult(replaceMessageEditorSelectionText(this.params.getMessages(), selection, replacement));
  }

  replaceSelectionTextAsBlocks(selection: MessageEditorSelection, replacement: string) {
    return this.commitSelectionResult(replaceMessageEditorSelectionTextAsBlocks(this.params.getMessages(), selection, replacement));
  }

  transformSelectionText(selection: MessageEditorSelection, transform: (selectedText: string) => string) {
    return this.commitSelectionResult(transformMessageEditorSelectionText(this.params.getMessages(), selection, transform));
  }

  insertBlockAtPoint(point: { blockId: string; offset: number }, kind: Parameters<typeof createMessageEditorBlockDraft>[0]) {
    const result = insertMessageEditorBlockAtPoint(this.params.getMessages(), {
      blockId: point.blockId,
      kind,
      offset: point.offset,
    });
    if (!result) {
      return null;
    }
    this.commitResolvedMessages(result.messages);
    return result;
  }

  insertBlockAtSelection(selection: MessageEditorSelection, kind: Parameters<typeof createMessageEditorBlockDraft>[0]) {
    const result = insertMessageEditorBlockAtSelection(this.params.getMessages(), selection, kind);
    if (!result) {
      return null;
    }
    this.commitResolvedMessages(result.messages);
    return result;
  }

  mergeBackward(blockId: string) {
    const result = mergeMessageEditorMessageBackward(this.params.getMessages(), blockId);
    if (!result) {
      return null;
    }
    this.commitResolvedMessages(result.messages);
    return result.focus;
  }

  mergeForward(blockId: string) {
    const result = mergeMessageEditorMessageForward(this.params.getMessages(), blockId);
    if (!result) {
      return null;
    }
    this.commitResolvedMessages(result.messages);
    return result.focus;
  }

  moveBlock(blockId: string, direction: -1 | 1) {
    this.commitMessages(previous => moveMessageEditorMessage(previous, blockId, direction));
  }

  moveBlockToIndex(blockId: string, targetIndex: number) {
    this.commitMessages(previous => moveMessageEditorMessageToIndex(previous, blockId, targetIndex));
  }

  replaceBlockWithKind(blockId: string, kind: Parameters<typeof createMessageEditorBlockDraft>[0]) {
    const currentMessages = ensureMessageEditorMessages(this.params.getMessages());
    const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
    if (index < 0) {
      return null;
    }

    const nextBlock = createMessageEditorBlockDraft(kind, currentMessages[index]);
    const nextMessages = [...currentMessages];
    nextMessages.splice(index, 1, nextBlock);
    this.commitResolvedMessages(nextMessages);

    return this.params.registry.isTextBlock(nextBlock)
      ? {
          blockId: getMessageEditorBlockId(nextBlock),
          caret: normalizeMessageEditorContent(nextBlock.content).length,
        }
      : null;
  }

  getAdjacentTextBlock(blockId: string, direction: -1 | 1, preferredOffset?: number) {
    const currentMessages = ensureMessageEditorMessages(this.params.getMessages());
    const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
    if (index < 0) {
      return null;
    }

    for (let nextIndex = index + direction; nextIndex >= 0 && nextIndex < currentMessages.length; nextIndex += direction) {
      const nextMessage = currentMessages[nextIndex];
      if (!this.params.registry.isTextBlock(nextMessage)) {
        continue;
      }

      const nextContentLength = String(nextMessage.content ?? "").length;
      return {
        blockId: getMessageEditorBlockId(nextMessage),
        caret: Math.max(
          0,
          Math.min(preferredOffset ?? (direction < 0 ? nextContentLength : 0), nextContentLength),
        ),
      };
    }

    return null;
  }

  removeBlock(blockId: string) {
    const currentMessages = ensureMessageEditorMessages(this.params.getMessages());
    const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
    if (index < 0) {
      return null;
    }

    const nextMessages = ensureMessageEditorMessages(currentMessages.filter(message => getMessageEditorBlockId(message) !== blockId));
    this.commitResolvedMessages(nextMessages);

    const focusCandidate = nextMessages[index] ?? nextMessages[index - 1] ?? nextMessages[0];
    if (!focusCandidate || !this.params.registry.isTextBlock(focusCandidate)) {
      return null;
    }

    return {
      blockId: getMessageEditorBlockId(focusCandidate),
      caret: String(focusCandidate.content ?? "").length,
    };
  }

  ensureTrailingTextBlock() {
    const currentMessages = ensureMessageEditorMessages(this.params.getMessages());
    const lastMessage = currentMessages.at(-1);
    if (lastMessage && this.params.registry.isTextBlock(lastMessage) && String(lastMessage.content ?? "").length === 0) {
      return {
        blockId: getMessageEditorBlockId(lastMessage),
        caret: 0,
      };
    }

    const nextBlock = createMessageEditorTextDraft({
      sourceMessage: lastMessage,
    });
    this.commitMessages(previous => [...ensureMessageEditorMessages(previous), nextBlock]);

    return {
      blockId: getMessageEditorBlockId(nextBlock),
      caret: 0,
    };
  }

  private commitMessages(
    updater: (previous: MessageEditorMessage[]) => MessageEditorMessage[],
    historyKind?: "default" | "typing",
  ) {
    this.params.setMessages((previous) => {
      const nextMessages = ensureMessageEditorMessages(updater(previous));
      this.emitBlocksChanged(nextMessages);
      return nextMessages;
    }, historyKind);
  }

  private commitResolvedMessages(messages: MessageEditorMessage[]) {
    this.commitMessages(() => messages);
  }

  private commitSelectionResult(result: MessageEditorSelectionTextResult | null) {
    if (!result) {
      return null;
    }
    this.commitResolvedMessages(result.messages);
    return result;
  }

  private emitBlocksChanged(messages: MessageEditorMessage[]) {
    this.params.eventBus?.emit("blocksChanged", {
      blockIds: ensureMessageEditorMessages(messages).map(message => getMessageEditorBlockId(message)),
    });
  }
}

/**
 * 创建绑定到 React state 的编辑器控制器。
 */
export function createMessageEditorController(params: MessageEditorControllerParams): MessageEditorController {
  return new MessageEditorDocumentController(params);
}
