import type { MessageDraft } from "@/types/messageDraft";
import type { MessageEditorBlockType, MessageEditorInlineMarkType } from "@tuanchat/domain";

import type { MessageEditorEventBus } from "./messageEditorEventBus";
import type { MessageEditorRegistry } from "./messageEditorRegistry";
import type { MessageEditorSelection } from "./messageEditorSelection";

import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  isMessageEditorInlineMarkFullyCovered,
  mergeMessageEditorMessageBackward,
  mergeMessageEditorMessageForward,
  moveMessageEditorMessage,
  moveMessageEditorMessageToIndex,
  setMessageEditorBlockType,
  setMessageEditorColorMark,
  setMessageEditorInlineMarkActive,
  splitMessageEditorMessage,
  updateMessageEditorTextContent,
} from "../model/messageEditorTransforms";

type SetMessages = (updater: (previous: MessageDraft[]) => MessageDraft[]) => void;

/**
 * message editor 命令控制器。
 */
export type MessageEditorController = {
  setActiveBlock: (blockId: string | null) => void;
  updateBlock: (blockId: string, updater: (message: MessageDraft) => MessageDraft) => void;
  updateTextContent: (blockId: string, nextContent: string) => void;
  splitAtSelection: (selection: MessageEditorSelection) => { blockId: string; caret: number } | null;
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
  applyInlineMark: (selection: MessageEditorSelection, type: Exclude<MessageEditorInlineMarkType, "color">) => void;
  applyColorMark: (selection: MessageEditorSelection, color?: string) => void;
  applyBlockType: (selection: MessageEditorSelection, blockType: MessageEditorBlockType) => void;
};

/**
 * 创建绑定到 React state 的编辑器控制器。
 */
export function createMessageEditorController(params: {
  eventBus?: MessageEditorEventBus;
  getMessages: () => MessageDraft[];
  registry: MessageEditorRegistry;
  setMessages: SetMessages;
}): MessageEditorController {
  const emitBlocksChanged = (messages: MessageDraft[]) => {
    params.eventBus?.emit("blocksChanged", {
      blockIds: ensureMessageEditorMessages(messages).map(message => getMessageEditorBlockId(message)),
    });
  };

  return {
    setActiveBlock(blockId) {
      params.eventBus?.emit("activeBlockChanged", { blockId });
    },
    updateBlock(blockId, updater) {
      params.setMessages((previous) => {
        const nextMessages = ensureMessageEditorMessages(previous).map((message) => {
          return getMessageEditorBlockId(message) === blockId ? updater(message) : message;
        });
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });
    },
    updateTextContent(blockId, nextContent) {
      params.setMessages((previous) => {
        const nextMessages = ensureMessageEditorMessages(previous).map((message) => {
          return getMessageEditorBlockId(message) === blockId
            ? updateMessageEditorTextContent(message, nextContent)
            : message;
        });
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });
    },
    splitAtSelection(selection) {
      if (selection.multiBlock) {
        return null;
      }

      const result = splitMessageEditorMessage(params.getMessages(), {
        blockId: selection.start.blockId,
        selectionStart: selection.start.offset,
        selectionEnd: selection.end.offset,
      });
      params.setMessages(() => {
        emitBlocksChanged(result.messages);
        return result.messages;
      });
      return result.focus;
    },
    mergeBackward(blockId) {
      const result = mergeMessageEditorMessageBackward(params.getMessages(), blockId);
      if (!result) {
        return null;
      }
      params.setMessages(() => {
        emitBlocksChanged(result.messages);
        return result.messages;
      });
      return result.focus;
    },
    mergeForward(blockId) {
      const result = mergeMessageEditorMessageForward(params.getMessages(), blockId);
      if (!result) {
        return null;
      }
      params.setMessages(() => {
        emitBlocksChanged(result.messages);
        return result.messages;
      });
      return result.focus;
    },
    moveBlock(blockId, direction) {
      params.setMessages((previous) => {
        const nextMessages = moveMessageEditorMessage(previous, blockId, direction);
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });
    },
    moveBlockToIndex(blockId, targetIndex) {
      params.setMessages((previous) => {
        const nextMessages = moveMessageEditorMessageToIndex(previous, blockId, targetIndex);
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });
    },
    replaceBlockWithKind(blockId, kind) {
      const currentMessages = ensureMessageEditorMessages(params.getMessages());
      const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
      if (index < 0) {
        return null;
      }

      const nextBlock = createMessageEditorBlockDraft(kind);
      params.setMessages(() => {
        const nextMessages = [...currentMessages];
        nextMessages.splice(index, 1, nextBlock);
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });

      return params.registry.isTextBlock(nextBlock)
        ? {
            blockId: getMessageEditorBlockId(nextBlock),
            caret: 0,
          }
        : null;
    },
    getAdjacentTextBlock(blockId, direction, preferredOffset) {
      const currentMessages = ensureMessageEditorMessages(params.getMessages());
      const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
      if (index < 0) {
        return null;
      }

      for (let nextIndex = index + direction; nextIndex >= 0 && nextIndex < currentMessages.length; nextIndex += direction) {
        const nextMessage = currentMessages[nextIndex];
        if (!params.registry.isTextBlock(nextMessage)) {
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
    },
    removeBlock(blockId) {
      const currentMessages = ensureMessageEditorMessages(params.getMessages());
      const index = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
      if (index < 0) {
        return null;
      }

      const nextMessages = ensureMessageEditorMessages(currentMessages.filter(message => getMessageEditorBlockId(message) !== blockId));
      params.setMessages(() => {
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });

      const focusCandidate = nextMessages[index] ?? nextMessages[index - 1] ?? nextMessages[0];
      if (!focusCandidate || !params.registry.isTextBlock(focusCandidate)) {
        return null;
      }

      return {
        blockId: getMessageEditorBlockId(focusCandidate),
        caret: String(focusCandidate.content ?? "").length,
      };
    },
    ensureTrailingTextBlock() {
      const currentMessages = ensureMessageEditorMessages(params.getMessages());
      const lastMessage = currentMessages.at(-1);
      if (lastMessage && params.registry.isTextBlock(lastMessage) && String(lastMessage.content ?? "").length === 0) {
        return {
          blockId: getMessageEditorBlockId(lastMessage),
          caret: 0,
        };
      }

      const nextBlock = createMessageEditorTextDraft();
      params.setMessages((previous) => {
        const nextMessages = [...ensureMessageEditorMessages(previous), nextBlock];
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });

      return {
        blockId: getMessageEditorBlockId(nextBlock),
        caret: 0,
      };
    },
    applyInlineMark(selection, type) {
      if (selection.collapsed || selection.segments.length === 0) {
        return;
      }

      const currentMessages = ensureMessageEditorMessages(params.getMessages());
      const shouldEnable = !selection.segments.every((segment) => {
        const message = currentMessages.find(item => getMessageEditorBlockId(item) === segment.blockId);
        return message
          ? isMessageEditorInlineMarkFullyCovered(message, {
              type,
              start: segment.start,
              end: segment.end,
            })
          : false;
      });

      params.setMessages((previous) => {
        const nextMessages = ensureMessageEditorMessages(previous).map((message) => {
          const segment = selection.segments.find(item => item.blockId === getMessageEditorBlockId(message));
          if (!segment) {
            return message;
          }
          return setMessageEditorInlineMarkActive(message, {
            type,
            start: segment.start,
            end: segment.end,
            active: shouldEnable,
          });
        });
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });
    },
    applyColorMark(selection, color) {
      if (selection.collapsed || selection.segments.length === 0) {
        return;
      }

      params.setMessages((previous) => {
        const nextMessages = ensureMessageEditorMessages(previous).map((message) => {
          const segment = selection.segments.find(item => item.blockId === getMessageEditorBlockId(message));
          if (!segment) {
            return message;
          }
          return setMessageEditorColorMark(message, {
            color,
            start: segment.start,
            end: segment.end,
          });
        });
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });
    },
    applyBlockType(selection, blockType) {
      params.setMessages((previous) => {
        const nextMessages = ensureMessageEditorMessages(previous).map((message) => {
          if (!selection.blockIds.includes(getMessageEditorBlockId(message)) || !params.registry.isTextBlock(message)) {
            return message;
          }
          return setMessageEditorBlockType(message, blockType);
        });
        emitBlocksChanged(nextMessages);
        return nextMessages;
      });
    },
  };
}
