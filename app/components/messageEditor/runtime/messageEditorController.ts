import type { MessageDraft } from "@/types/messageDraft";
import type { MessageEditorBlockType, MessageEditorInlineMarkType } from "@tuanchat/domain";

import type { MessageEditorEventBus } from "./messageEditorEventBus";
import type { MessageEditorRegistry } from "./messageEditorRegistry";
import type { MessageEditorSelection } from "./messageEditorSelection";

import {
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  isMessageEditorInlineMarkFullyCovered,
  mergeMessageEditorMessageBackward,
  mergeMessageEditorMessageForward,
  moveMessageEditorMessage,
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
  updateTextContent: (blockId: string, nextContent: string) => void;
  splitAtSelection: (selection: MessageEditorSelection) => { blockId: string; caret: number } | null;
  mergeBackward: (blockId: string) => { blockId: string; caret: number } | null;
  mergeForward: (blockId: string) => { blockId: string; caret: number } | null;
  moveBlock: (blockId: string, direction: -1 | 1) => void;
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
