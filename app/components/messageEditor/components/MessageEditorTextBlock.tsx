// oxlint-disable jsx-a11y/no-static-element-interactions
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { MessageDraft } from "@/types/messageDraft";

import { useLayoutEffect, useRef } from "react";
import ChatInputArea from "@/components/chat/input/chatInputArea";
import EditableMessageContent from "@/components/chat/message/editableMessageContent";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  normalizeMessageEditorContent,
  parseMessageEditorMarkdownPreview,
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
  selectionSegment?: { end: number; showLineBreakAfter?: boolean; start: number } | null;
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

function renderSelectedLineBreak(showLineBreakAfter: boolean | undefined) {
  if (!showLineBreakAfter) {
    return null;
  }

  return (
    <span className="rounded-sm bg-sky-200 px-1 text-slate-950/70">
      ↵
    </span>
  );
}

function renderSourceContentWithSelection(content: string, selectionSegment: { end: number; showLineBreakAfter?: boolean; start: number } | null) {
  if (!selectionSegment) {
    return null;
  }

  const start = Math.max(0, Math.min(selectionSegment.start, content.length));
  const end = Math.max(start, Math.min(selectionSegment.end, content.length));
  if (content.length === 0 && start === 0 && end === 0) {
    return (
      <span className="block min-h-6 w-full rounded-sm bg-sky-200 text-slate-950">
        {renderSelectedLineBreak(selectionSegment.showLineBreakAfter)}
      </span>
    );
  }

  return (
    <>
      {content.slice(0, start)}
      <span className="rounded-sm bg-sky-200 text-slate-950">
        {content.slice(start, end)}
      </span>
      {renderSelectedLineBreak(selectionSegment.showLineBreakAfter)}
      {content.slice(end)}
    </>
  );
}

function blockClassName(message: MessageDraft, previewKind: ReturnType<typeof parseMessageEditorMarkdownPreview>["kind"]) {
  const base = [
    "relative rounded-md px-0 py-0 transition selection:bg-sky-200 selection:text-slate-950",
    "bg-transparent",
  ];

  if (message.messageType === MESSAGE_TYPE.INTRO_TEXT) {
    base.push("bg-black text-white shadow-inner");
  }
  else if (previewKind === "heading1") {
    base.push("text-3xl font-semibold leading-tight");
  }
  else if (previewKind === "heading2") {
    base.push("text-2xl font-semibold leading-tight");
  }
  else if (previewKind === "heading3") {
    base.push("text-xl font-semibold leading-snug");
  }
  else if (previewKind === "quote") {
    base.push("text-[15px] leading-6 text-base-content/80");
  }
  else {
    base.push("text-[15px] leading-6");
  }

  return base.join(" ");
}

function textContentClassName(message: MessageDraft, previewKind: ReturnType<typeof parseMessageEditorMarkdownPreview>["kind"]) {
  return [
    "min-h-6 whitespace-pre-wrap break-words [word-break:normal] outline-none selection:bg-sky-200 selection:text-slate-950",
    message.messageType === MESSAGE_TYPE.INTRO_TEXT ? "text-white" : "",
    previewKind === "heading1" ? "text-3xl font-semibold leading-tight" : "",
    previewKind === "heading2" ? "text-2xl font-semibold leading-tight" : "",
    previewKind === "heading3" ? "text-xl font-semibold leading-snug" : "",
    previewKind === "quote" ? "text-base-content/80" : "",
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
  const preview = parseMessageEditorMarkdownPreview(content);
  const previewKind = message.messageType === MESSAGE_TYPE.INTRO_TEXT ? "paragraph" : preview.kind;

  useLayoutEffect(() => {
    const node = blockContentRef.current;
    if (!node || !sourceMode || editableSourceMode || selectionSegment) {
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
    editor.dataset.meBlockId = blockId;
    editor.dataset.meTextMode = "source";
    registerBlockRef(blockId, editor);
    if (!content && editor.childNodes.length === 0) {
      effectiveTextInputRef.current?.setContent("<br>", {
        moveCursorToEnd: false,
      });
    }
    else if (normalizeEditableText(editor.textContent ?? "") !== content) {
      effectiveTextInputRef.current?.setContent(plainTextToHtml(content), {
        moveCursorToEnd: false,
      });
    }
    // 预览态首次切入编辑态时要主动聚焦，否则第一次点击只会切换组件，不会出现光标。
    if (!wasEditableSourceModeRef.current) {
      effectiveTextInputRef.current?.focus({
        moveCursorToEnd: false,
      });
    }
    wasEditableSourceModeRef.current = true;

    return () => {
      delete editor.dataset.meBlockId;
      delete editor.dataset.meTextMode;
      registerBlockRef(blockId, null);
    };
  }, [blockId, content, editableSourceMode, effectiveTextInputRef, registerBlockRef]);

  const contentClassName = textContentClassName(message, previewKind);
  const previewContent = previewKind === "paragraph" ? content : preview.content;
  const previewNode = (
    <EditableMessageContent
      content={previewContent}
      canEdit={false}
      className={contentClassName}
      onCommit={() => {}}
    />
  );

  return (
    <div
      className={blockClassName(message, previewKind)}
      data-me-block-hit={blockId}
      onMouseDown={event => onMouseDown?.(blockId, event)}
    >
      {!content && !active && !readOnly && (
        <div className="pointer-events-none absolute inset-x-0 top-0 text-base-content/25">
          {placeholder}
        </div>
      )}
      {sourceMode
        ? (editableSourceMode
            ? (
                <div
                  onMouseDownCapture={() => {
                    onFocus(blockId);
                  }}
                >
                  <ChatInputArea
                    ref={effectiveTextInputRef}
                    className={`!overflow-visible !p-0 ${contentClassName}`}
                    inputScope="message-edit"
                    placeholder={placeholder}
                    disabled={false}
                    onInputSync={(plainText) => {
                      onInput(blockId, normalizeEditableText(plainText));
                    }}
                    onPasteFiles={() => {}}
                    onKeyDown={event => onKeyDown(blockId, event)}
                    onKeyUp={() => {}}
                    onMouseDown={() => {}}
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
                  contentEditable={!readOnly && active && selectionSegment === null}
                  suppressContentEditableWarning
                  className={contentClassName}
                  onMouseDownCapture={() => {
                    if (!readOnly && selectionSegment === null) {
                      onFocus(blockId);
                    }
                  }}
                  onFocus={() => onFocus(blockId)}
                  onBlur={() => onBlur?.(blockId)}
                  onInput={(event) => {
                    onInput(blockId, normalizeEditableText(event.currentTarget.textContent ?? ""));
                  }}
                  onKeyDown={event => onKeyDown(blockId, event)}
                >
                  {renderSourceContentWithSelection(content, selectionSegment)}
                </div>
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
            >
              {previewKind === "bulletedList" && (
                <ul className="m-0 list-disc pl-6">
                  <li>{previewNode}</li>
                </ul>
              )}
              {previewKind === "numberedList" && (
                <ol start={preview.orderedNumber ?? 1} className="m-0 list-decimal pl-6">
                  <li>{previewNode}</li>
                </ol>
              )}
              {previewKind === "quote" && (
                <div className="border-l-4 border-base-300 pl-3">
                  {previewNode}
                </div>
              )}
              {(previewKind === "paragraph" || previewKind === "heading1" || previewKind === "heading2" || previewKind === "heading3") && previewNode}
            </div>
          )}
    </div>
  );
}
