// oxlint-disable jsx-a11y/no-static-element-interactions
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { MessageDraft } from "@/types/messageDraft";

import { useLayoutEffect, useRef } from "react";
import ChatInputArea from "@/components/chat/input/chatInputArea";
import EditableMessageContent from "@/components/chat/message/editableMessageContent";

import {
  getMessageEditorBlockType,
  normalizeMessageEditorContent,
} from "../model/messageEditorTransforms";

interface MessageEditorTextBlockProps {
  active: boolean;
  blockId: string;
  message: MessageDraft;
  onBlur?: (blockId: string) => void;
  onFocus: (blockId: string) => void;
  onInput: (blockId: string, nextContent: string) => void;
  onKeyDown: (blockId: string, event: React.KeyboardEvent<HTMLDivElement>) => void;
  onMouseDown?: (blockId: string, event: React.MouseEvent<HTMLDivElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
  registerBlockRef: (blockId: string, node: HTMLDivElement | null) => void;
  selectionSegment?: { start: number; end: number } | null;
  textInputRef?: React.RefObject<ChatInputAreaHandle | null>;
}

function normalizeEditableText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function plainTextToHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function blockClassName(message: MessageDraft, readOnly: boolean) {
  const blockType = getMessageEditorBlockType(message);
  const base = [
    "relative rounded-md px-2 py-1.5 transition selection:bg-sky-200 selection:text-slate-950",
    "bg-transparent",
    readOnly ? "" : "hover:bg-base-200/80",
  ];

  if (blockType === "heading1") {
    base.push("text-3xl font-semibold tracking-tight");
  }
  else if (blockType === "heading2") {
    base.push("text-2xl font-semibold tracking-tight");
  }
  else if (blockType === "heading3") {
    base.push("text-xl font-semibold");
  }
  else if (blockType === "intro") {
    base.push("bg-black text-white shadow-inner");
  }
  else {
    base.push("text-[15px] leading-6");
  }

  return base.join(" ");
}

function textContentClassName(message: MessageDraft) {
  const blockType = getMessageEditorBlockType(message);
  return [
    "min-h-6 whitespace-pre-wrap break-words outline-none selection:bg-sky-200 selection:text-slate-950",
    blockType === "intro" ? "text-white" : "",
  ].join(" ");
}

/**
 * 单个文本块视图。
 */
export function MessageEditorTextBlock({
  active,
  blockId,
  message,
  onBlur,
  onFocus,
  onInput,
  onKeyDown,
  onMouseDown,
  placeholder = "",
  readOnly = false,
  registerBlockRef,
  selectionSegment = null,
  textInputRef,
}: MessageEditorTextBlockProps) {
  const content = normalizeMessageEditorContent(message.content);
  const blockContentRef = useRef<HTMLDivElement | null>(null);
  const localTextInputRef = useRef<ChatInputAreaHandle | null>(null);
  const effectiveTextInputRef = textInputRef ?? localTextInputRef;
  const wasEditableSourceModeRef = useRef(false);
  const sourceMode = active || selectionSegment !== null;
  const editableSourceMode = sourceMode && active && !readOnly && selectionSegment === null;

  useLayoutEffect(() => {
    const node = blockContentRef.current;
    if (!node || !sourceMode || editableSourceMode) {
      return;
    }

    const normalizedDomText = normalizeEditableText(node.textContent ?? "");
    const alreadyPlainTextNode = node.childNodes.length === 1 && node.firstChild?.nodeType === Node.TEXT_NODE;
    if (!readOnly && active && !selectionSegment) {
      if (!content) {
        if (node.childNodes.length === 1 && node.firstChild instanceof HTMLBRElement) {
          return;
        }
        node.replaceChildren(document.createElement("br"));
        return;
      }

      if (alreadyPlainTextNode && normalizedDomText === content) {
        return;
      }

      node.replaceChildren(document.createTextNode(content));
      return;
    }

    if (!content) {
      node.replaceChildren();
      return;
    }

    if (alreadyPlainTextNode && normalizedDomText === content) {
      return;
    }

    node.replaceChildren(document.createTextNode(content));
  }, [active, content, editableSourceMode, readOnly, selectionSegment, sourceMode]);

  useLayoutEffect(() => {
    if (!editableSourceMode) {
      wasEditableSourceModeRef.current = false;
      return;
    }

    const editor = effectiveTextInputRef.current?.getRawElement();
    if (!editor) {
      return;
    }

    blockContentRef.current = editor;
    registerBlockRef(blockId, editor);
    if (normalizeEditableText(editor.textContent ?? "") !== content) {
      effectiveTextInputRef.current?.setContent(plainTextToHtml(content));
    }
    // 预览态首次切入编辑态时要主动聚焦，否则第一次点击只会切换组件，不会出现光标。
    if (!wasEditableSourceModeRef.current) {
      effectiveTextInputRef.current?.focus();
    }
    wasEditableSourceModeRef.current = true;

    return () => {
      registerBlockRef(blockId, null);
    };
  }, [blockId, content, editableSourceMode, effectiveTextInputRef, registerBlockRef]);

  const contentClassName = textContentClassName(message);

  return (
    <div className={blockClassName(message, readOnly)}>
      {!content && !active && !readOnly && (
        <div className="pointer-events-none absolute inset-x-3 top-1.5 text-base-content/25">
          {placeholder}
        </div>
      )}
      {sourceMode
        ? (editableSourceMode
            ? (
                <div
                  data-me-block-id={blockId}
                  data-me-text-mode="source"
                  onMouseDownCapture={() => {
                    onFocus(blockId);
                  }}
                  onMouseDown={event => onMouseDown?.(blockId, event)}
                >
                  <ChatInputArea
                    ref={effectiveTextInputRef}
                    className={contentClassName}
                    inputScope="message-edit"
                    placeholder={placeholder}
                    disabled={false}
                    onInputSync={(plainText) => {
                      onInput(blockId, normalizeEditableText(plainText));
                    }}
                    onPasteFiles={() => {}}
                    onKeyDown={event => onKeyDown(blockId, event)}
                    onKeyUp={() => {}}
                    onMouseDown={(event) => {
                      event.stopPropagation();
                    }}
                    onCompositionStart={() => {}}
                    onCompositionEnd={() => {}}
                    onFocus={() => onFocus(blockId)}
                    onBlur={() => onBlur?.(blockId)}
                  />
                </div>
              )
            : (
                <div
                  ref={(node) => {
                    blockContentRef.current = node;
                    registerBlockRef(blockId, node);
                  }}
                  data-me-block-id={blockId}
                  data-me-text-mode="source"
                  contentEditable={!readOnly && active}
                  suppressContentEditableWarning
                  className={contentClassName}
                  onMouseDownCapture={() => {
                    if (!readOnly) {
                      onFocus(blockId);
                    }
                  }}
                  onMouseDown={event => onMouseDown?.(blockId, event)}
                  onFocus={() => onFocus(blockId)}
                  onBlur={() => onBlur?.(blockId)}
                  onInput={(event) => {
                    onInput(blockId, normalizeEditableText(event.currentTarget.textContent ?? ""));
                  }}
                  onKeyDown={event => onKeyDown(blockId, event)}
                />
              )
          )
        : (
            <div
              ref={(node) => {
                blockContentRef.current = node;
                registerBlockRef(blockId, node);
              }}
              data-me-block-id={blockId}
              data-me-text-mode="preview"
              className={contentClassName}
              onMouseDownCapture={() => {
                if (!readOnly) {
                  onFocus(blockId);
                }
              }}
              onMouseDown={event => onMouseDown?.(blockId, event)}
            >
              <EditableMessageContent
                content={content}
                canEdit={false}
                className={contentClassName}
                onCommit={() => {}}
              />
            </div>
          )}
    </div>
  );
}
