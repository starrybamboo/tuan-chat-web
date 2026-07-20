import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorInsertableBlockKind } from "./messageEditorTransforms";

import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  inheritMessageEditorRuntimeBlockId,
  isMessageEditorTextMessage,
  normalizeMessageEditorContent,
  updateMessageEditorTextContent,
} from "./messageEditorTransforms";

/**
 * 文本块拆分或合并后的聚焦位置。
 */
export type MessageEditorFocusTarget = {
  blockId: string;
  caret: number;
};

/**
 * 文本块拆分结果。
 */
export type MessageEditorSplitResult = {
  messages: MessageEditorMessage[];
  focus: MessageEditorFocusTarget;
};

/**
 * 文本块合并结果。
 */
export type MessageEditorMergeResult = {
  messages: MessageEditorMessage[];
  focus: MessageEditorFocusTarget;
};

export type MessageEditorTextSelectionPoint = {
  blockId: string;
  offset: number;
};

export type MessageEditorTextSelectionSegment = {
  blockId: string;
  start: number;
  end: number;
};

export type MessageEditorTextSelection = {
  end: MessageEditorTextSelectionPoint;
  segments: MessageEditorTextSelectionSegment[];
  start: MessageEditorTextSelectionPoint;
};

export type MessageEditorSelectionTextResult = {
  messages: MessageEditorMessage[];
  focus: MessageEditorFocusTarget;
  selection: MessageEditorTextSelection;
};

export type MessageEditorInsertBlockResult = {
  focus: MessageEditorFocusTarget;
  insertedBlockId: string;
  messages: MessageEditorMessage[];
};

/**
 * 在当前光标位置拆分文本块。
 */
export function splitMessageEditorMessage(
  messages: MessageEditorMessage[],
  params: {
    blockId: string;
    selectionEnd: number;
    selectionStart: number;
  },
): MessageEditorSplitResult {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === params.blockId);
  if (index < 0) {
    const fallback = createMessageEditorTextDraft();
    return {
      messages: [...normalizedMessages, fallback],
      focus: {
        blockId: getMessageEditorBlockId(fallback),
        caret: 0,
      },
    };
  }

  const current = normalizedMessages[index];
  const content = normalizeMessageEditorContent(current.content);
  const selectionStart = Math.max(0, Math.min(params.selectionStart, content.length));
  const selectionEnd = Math.max(selectionStart, Math.min(params.selectionEnd, content.length));
  const before = content.slice(0, selectionStart);
  const after = content.slice(selectionEnd);

  if (selectionStart === 0 && selectionEnd === 0) {
    const blankBeforeMessage = createMessageEditorTextDraft();
    const nextMessages = [...normalizedMessages];
    nextMessages.splice(index, 0, blankBeforeMessage);

    return {
      messages: nextMessages,
      focus: {
        blockId: getMessageEditorBlockId(current),
        caret: 0,
      },
    };
  }

  const beforeMessage = inheritMessageEditorRuntimeBlockId(current, {
    ...current,
    content: before,
  });
  const nextMessage = createMessageEditorTextDraft({
    annotations: current.annotations,
    content: after,
    extra: current.extra,
    messageType: current.messageType === MESSAGE_TYPE.INTRO_TEXT ? MESSAGE_TYPE.TEXT : current.messageType,
  });

  const nextMessages = [...normalizedMessages];
  nextMessages.splice(index, 1, beforeMessage, nextMessage);

  return {
    messages: nextMessages,
    focus: {
      blockId: getMessageEditorBlockId(nextMessage),
      caret: 0,
    },
  };
}

function clampTextOffset(message: MessageEditorMessage, offset: number) {
  const contentLength = normalizeMessageEditorContent(message.content).length;
  return Math.max(0, Math.min(offset, contentLength));
}

function createTextTailAfterInsertedBlock(source: MessageEditorMessage, content = "") {
  const sourceIsText = isMessageEditorTextMessage(source);
  return createMessageEditorTextDraft({
    annotations: sourceIsText ? source.annotations : undefined,
    content,
    extra: sourceIsText ? source.extra : undefined,
    messageType: sourceIsText && source.messageType !== MESSAGE_TYPE.INTRO_TEXT ? source.messageType : MESSAGE_TYPE.TEXT,
  });
}

/**
 * 在文本光标或原子块边界插入一个块，并创建后续空文本块以便继续输入。
 */
export function insertMessageEditorBlockAtPoint(
  messages: MessageEditorMessage[],
  params: {
    blockId: string;
    kind: MessageEditorInsertableBlockKind;
    offset: number;
  },
): MessageEditorInsertBlockResult | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === params.blockId);
  if (index < 0) {
    return null;
  }

  const current = normalizedMessages[index];
  const insertedBlock = createMessageEditorBlockDraft(params.kind, current);
  const insertedBlockId = getMessageEditorBlockId(insertedBlock);
  const nextTextBlock = createTextTailAfterInsertedBlock(current);
  const nextMessages = [...normalizedMessages];

  if (!isMessageEditorTextMessage(current)) {
    const insertionIndex = params.offset <= 0 ? index : index + 1;
    nextMessages.splice(insertionIndex, 0, insertedBlock, nextTextBlock);
    return {
      focus: {
        blockId: getMessageEditorBlockId(nextTextBlock),
        caret: 0,
      },
      insertedBlockId,
      messages: nextMessages,
    };
  }

  const content = normalizeMessageEditorContent(current.content);
  const offset = clampTextOffset(current, params.offset);
  const before = content.slice(0, offset);
  const after = content.slice(offset);
  const replacement: MessageEditorMessage[] = [];

  if (before.length > 0) {
    replacement.push(updateMessageEditorTextContent(current, before));
  }

  replacement.push(insertedBlock);

  if (after.length > 0) {
    replacement.push(before.length > 0
      ? createTextTailAfterInsertedBlock(current, after)
      : updateMessageEditorTextContent(current, after));
  }
  else {
    replacement.push(nextTextBlock);
  }

  nextMessages.splice(index, 1, ...replacement);
  const focusBlock = replacement.at(-1)!;
  return {
    focus: {
      blockId: getMessageEditorBlockId(focusBlock),
      caret: 0,
    },
    insertedBlockId,
    messages: nextMessages,
  };
}

/**
 * 用一个块替换当前文档选区；折叠选区则在光标处插入。
 */
export function insertMessageEditorBlockAtSelection(
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
  kind: MessageEditorInsertableBlockKind,
): MessageEditorInsertBlockResult | null {
  if (selection.start.blockId === selection.end.blockId && selection.start.offset === selection.end.offset) {
    return insertMessageEditorBlockAtPoint(messages, {
      blockId: selection.start.blockId,
      kind,
      offset: selection.start.offset,
    });
  }

  const collapsed = replaceMessageEditorSelectionText(messages, selection, "");
  if (!collapsed) {
    return null;
  }

  return insertMessageEditorBlockAtPoint(collapsed.messages, {
    blockId: collapsed.focus.blockId,
    kind,
    offset: collapsed.focus.caret,
  });
}

function getMessageEditorSelectionOffset(message: MessageEditorMessage, offset: number) {
  if (!isMessageEditorTextMessage(message)) {
    return Math.max(0, Math.min(offset, 1));
  }
  return clampTextOffset(message, offset);
}

function resolveSelectionRange(
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
) {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const startIndex = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === selection.start.blockId);
  const endIndex = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === selection.end.blockId);
  if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
    return null;
  }

  return {
    endIndex,
    normalizedMessages,
    startIndex,
  };
}

/**
 * 用一段原始字符串替换 editor 级文本选区。跨块替换会合并边界块。
 */
export function replaceMessageEditorSelectionText(
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
  replacement: string,
): MessageEditorSelectionTextResult | null {
  const range = resolveSelectionRange(messages, selection);
  if (!range) {
    return null;
  }

  const { endIndex, normalizedMessages, startIndex } = range;
  const startMessage = normalizedMessages[startIndex];
  const endMessage = normalizedMessages[endIndex];
  const startIsText = isMessageEditorTextMessage(startMessage);
  const endIsText = isMessageEditorTextMessage(endMessage);
  const startOffset = getMessageEditorSelectionOffset(startMessage, selection.start.offset);
  const endOffset = getMessageEditorSelectionOffset(endMessage, selection.end.offset);
  const startPrefix = startIsText
    ? normalizeMessageEditorContent(startMessage.content).slice(0, startOffset)
    : "";
  const endSuffix = endIsText
    ? normalizeMessageEditorContent(endMessage.content).slice(endOffset)
    : "";
  const nextContent = `${startPrefix}${replacement}${endSuffix}`;
  const nextMessages = [...normalizedMessages];
  const shouldInsertTextBlock = nextContent.length > 0 || startIsText || endIsText || normalizedMessages.length === endIndex - startIndex + 1;
  const nextTextMessage = shouldInsertTextBlock
    ? (startIsText
        ? inheritMessageEditorRuntimeBlockId(startMessage, {
            ...startMessage,
            content: nextContent,
          })
        : endIsText
          ? inheritMessageEditorRuntimeBlockId(endMessage, {
              ...endMessage,
              content: nextContent,
            })
          : createMessageEditorTextDraft({ content: nextContent, sourceMessage: startMessage }))
    : null;
  nextMessages.splice(startIndex, endIndex - startIndex + 1, ...(nextTextMessage ? [nextTextMessage] : []));
  const normalizedNextMessages = ensureMessageEditorMessages(nextMessages);
  const focusMessage = nextTextMessage
    ?? normalizedNextMessages[startIndex]
    ?? normalizedNextMessages[startIndex - 1]
    ?? normalizedNextMessages[0];
  const focusBlockId = getMessageEditorBlockId(focusMessage);
  const focusCaret = isMessageEditorTextMessage(focusMessage)
    ? (focusMessage === nextTextMessage ? startPrefix.length + replacement.length : normalizeMessageEditorContent(focusMessage.content).length)
    : 0;
  const replacementStartBlockId = nextTextMessage ? getMessageEditorBlockId(nextTextMessage) : focusBlockId;
  const replacementStartOffset = nextTextMessage ? startPrefix.length : focusCaret;
  const replacementEndOffset = nextTextMessage ? startPrefix.length + replacement.length : focusCaret;

  return {
    messages: normalizedNextMessages,
    focus: {
      blockId: focusBlockId,
      caret: focusCaret,
    },
    selection: {
      start: {
        blockId: replacementStartBlockId,
        offset: replacementStartOffset,
      },
      end: {
        blockId: replacementStartBlockId,
        offset: replacementEndOffset,
      },
      segments: [
        {
          blockId: replacementStartBlockId,
          start: replacementStartOffset,
          end: replacementEndOffset,
        },
      ],
    },
  };
}

function splitPastedTextIntoBlocks(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 1 && lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

/**
 * 用粘贴文本替换 editor 级文本选区；换行会拆成多个消息块。
 */
export function replaceMessageEditorSelectionTextAsBlocks(
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
  replacement: string,
): MessageEditorSelectionTextResult | null {
  const lines = splitPastedTextIntoBlocks(replacement);
  if (lines.length <= 1) {
    return replaceMessageEditorSelectionText(messages, selection, replacement);
  }

  const range = resolveSelectionRange(messages, selection);
  if (!range) {
    return null;
  }

  const { endIndex, normalizedMessages, startIndex } = range;
  const startMessage = normalizedMessages[startIndex];
  const endMessage = normalizedMessages[endIndex];
  const startIsText = isMessageEditorTextMessage(startMessage);
  const endIsText = isMessageEditorTextMessage(endMessage);
  const startOffset = getMessageEditorSelectionOffset(startMessage, selection.start.offset);
  const endOffset = getMessageEditorSelectionOffset(endMessage, selection.end.offset);
  const startPrefix = startIsText
    ? normalizeMessageEditorContent(startMessage.content).slice(0, startOffset)
    : "";
  const endSuffix = endIsText
    ? normalizeMessageEditorContent(endMessage.content).slice(endOffset)
    : "";
  const firstLine = lines[0] ?? "";
  const lastLine = lines.at(-1) ?? "";
  const replacementMessages: MessageEditorMessage[] = [
    startIsText
      ? inheritMessageEditorRuntimeBlockId(startMessage, {
          ...startMessage,
          content: `${startPrefix}${firstLine}`,
        })
      : createMessageEditorTextDraft({ content: `${startPrefix}${firstLine}`, sourceMessage: startMessage }),
  ];

  for (let index = 1; index < lines.length; index += 1) {
    const isLast = index === lines.length - 1;
    replacementMessages.push(createMessageEditorTextDraft({
      content: `${lines[index]}${isLast ? endSuffix : ""}`,
      messageType: MESSAGE_TYPE.TEXT,
    }));
  }

  const nextMessages = [...normalizedMessages];
  nextMessages.splice(startIndex, endIndex - startIndex + 1, ...replacementMessages);
  const focusMessage = replacementMessages.at(-1)!;
  const firstReplacementBlockId = getMessageEditorBlockId(replacementMessages[0]);
  const lastReplacementBlockId = getMessageEditorBlockId(focusMessage);
  const focusCaret = lastLine.length;

  return {
    messages: ensureMessageEditorMessages(nextMessages),
    focus: {
      blockId: lastReplacementBlockId,
      caret: focusCaret,
    },
    selection: {
      start: {
        blockId: firstReplacementBlockId,
        offset: startPrefix.length,
      },
      end: {
        blockId: lastReplacementBlockId,
        offset: focusCaret,
      },
      segments: replacementMessages.map((message, index) => {
        const blockId = getMessageEditorBlockId(message);
        if (index === 0) {
          return {
            blockId,
            start: startPrefix.length,
            end: startPrefix.length + firstLine.length,
          };
        }
        const line = lines[index] ?? "";
        return {
          blockId,
          start: 0,
          end: line.length,
        };
      }),
    },
  };
}

/**
 * 对每个选区片段分别做文本变换，用于跨块加聊天室文本增强语法时保留块结构。
 */
export function transformMessageEditorSelectionText(
  messages: MessageEditorMessage[],
  selection: MessageEditorTextSelection,
  transform: (selectedText: string, segment: MessageEditorTextSelectionSegment) => string,
): MessageEditorSelectionTextResult | null {
  const range = resolveSelectionRange(messages, selection);
  if (!range) {
    return null;
  }

  const segmentByBlockId = new Map(selection.segments.map(segment => [segment.blockId, segment] as const));
  let focus: MessageEditorFocusTarget | null = null;
  const nextSegments: MessageEditorTextSelectionSegment[] = [];
  const nextMessages = range.normalizedMessages.map((message, index) => {
    if (index < range.startIndex || index > range.endIndex) {
      return message;
    }

    const blockId = getMessageEditorBlockId(message);
    const segment = segmentByBlockId.get(blockId);
    if (!segment || segment.end <= segment.start || !isMessageEditorTextMessage(message)) {
      return message;
    }

    const content = normalizeMessageEditorContent(message.content);
    const start = clampTextOffset(message, segment.start);
    const end = Math.max(start, clampTextOffset(message, segment.end));
    const replacement = transform(content.slice(start, end), {
      ...segment,
      end,
      start,
    });
    const nextMessage = inheritMessageEditorRuntimeBlockId(message, {
      ...message,
      content: `${content.slice(0, start)}${replacement}${content.slice(end)}`,
    });
    nextSegments.push({
      blockId: getMessageEditorBlockId(nextMessage),
      start,
      end: start + replacement.length,
    });
    focus = {
      blockId: getMessageEditorBlockId(nextMessage),
      caret: start + replacement.length,
    };
    return nextMessage;
  });

  return focus
    ? {
        messages: nextMessages,
        focus,
        selection: {
          start: {
            blockId: nextSegments[0].blockId,
            offset: nextSegments[0].start,
          },
          end: {
            blockId: nextSegments.at(-1)!.blockId,
            offset: nextSegments.at(-1)!.end,
          },
          segments: nextSegments,
        },
      }
    : null;
}

function mergeMessages(
  left: MessageEditorMessage,
  right: MessageEditorMessage,
): MessageEditorMessage {
  const leftContent = normalizeMessageEditorContent(left.content);
  const rightContent = normalizeMessageEditorContent(right.content);

  return inheritMessageEditorRuntimeBlockId(left, {
    ...left,
    content: `${leftContent}${rightContent}`,
  });
}

function removeMessageEditorMessageAt(
  messages: MessageEditorMessage[],
  removeIndex: number,
  focusMessage: MessageEditorMessage,
  caret: number,
): MessageEditorMergeResult {
  const nextMessages = [...messages];
  nextMessages.splice(removeIndex, 1);

  return {
    messages: nextMessages,
    focus: {
      blockId: getMessageEditorBlockId(focusMessage),
      caret,
    },
  };
}

/**
 * 在块首执行 Backspace 合并。
 */
export function mergeMessageEditorMessageBackward(
  messages: MessageEditorMessage[],
  blockId: string,
): MessageEditorMergeResult | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
  if (index <= 0) {
    return null;
  }

  const previous = normalizedMessages[index - 1];
  const current = normalizedMessages[index];
  if (!isMessageEditorTextMessage(current)) {
    return null;
  }

  if (!isMessageEditorTextMessage(previous)) {
    if (normalizeMessageEditorContent(current.content).length > 0) {
      return null;
    }
    return removeMessageEditorMessageAt(normalizedMessages, index - 1, current, 0);
  }

  if (normalizeMessageEditorContent(previous.content).length === 0) {
    return removeMessageEditorMessageAt(normalizedMessages, index - 1, current, 0);
  }

  const merged = mergeMessages(previous, current);
  const nextMessages = [...normalizedMessages];
  nextMessages.splice(index - 1, 2, merged);

  return {
    messages: nextMessages,
    focus: {
      blockId: getMessageEditorBlockId(merged),
      caret: normalizeMessageEditorContent(previous.content).length,
    },
  };
}

/**
 * 在块尾执行 Delete 合并。
 */
export function mergeMessageEditorMessageForward(
  messages: MessageEditorMessage[],
  blockId: string,
): MessageEditorMergeResult | null {
  const normalizedMessages = ensureMessageEditorMessages(messages);
  const index = normalizedMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
  if (index < 0 || index >= normalizedMessages.length - 1) {
    return null;
  }

  const current = normalizedMessages[index];
  const next = normalizedMessages[index + 1];
  if (!isMessageEditorTextMessage(current) || !isMessageEditorTextMessage(next)) {
    return null;
  }

  if (normalizeMessageEditorContent(current.content).length === 0) {
    return removeMessageEditorMessageAt(normalizedMessages, index, next, 0);
  }

  const merged = mergeMessages(current, next);
  const nextMessages = [...normalizedMessages];
  nextMessages.splice(index, 2, merged);

  return {
    messages: nextMessages,
    focus: {
      blockId: getMessageEditorBlockId(merged),
      caret: normalizeMessageEditorContent(current.content).length,
    },
  };
}
