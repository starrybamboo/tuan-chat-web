import type { MessageDraft } from "@/types/messageDraft";

import { useLayoutEffect, useRef } from "react";

import {
  getMessageEditorBlockType,
  getMessageEditorInlineMarks,
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
  placeholder?: string;
  readOnly?: boolean;
  registerBlockRef: (blockId: string, node: HTMLDivElement | null) => void;
}

interface InlineSegment {
  text: string;
  className: string;
  style?: React.CSSProperties;
}

function normalizeEditableText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

function buildInlineSegments(message: MessageDraft): InlineSegment[] {
  const content = normalizeMessageEditorContent(message.content);
  const marks = getMessageEditorInlineMarks(message);
  if (!content) {
    return [];
  }

  const breakpoints = Array.from(new Set([0, content.length, ...marks.flatMap(mark => [mark.start, mark.end])])).sort((left, right) => left - right);
  const segments: InlineSegment[] = [];

  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    const start = breakpoints[index];
    const end = breakpoints[index + 1];
    if (end <= start) {
      continue;
    }

    const text = content.slice(start, end);
    const activeMarks = marks.filter(mark => mark.start < end && mark.end > start);
    const classes = ["text-inherit"];
    const style: React.CSSProperties = {};
    for (const mark of activeMarks) {
      if (mark.type === "bold") {
        classes.push("font-semibold");
      }
      if (mark.type === "italic") {
        classes.push("italic");
      }
      if (mark.type === "code") {
        classes.push("rounded-sm", "bg-base-200", "px-1", "font-mono", "text-[0.92em]");
      }
      if (mark.type === "highlight") {
        classes.push("rounded-sm");
        style.backgroundColor = "rgba(250, 204, 21, 0.28)";
      }
      if (mark.type === "color" && mark.color) {
        style.color = mark.color;
      }
    }

    segments.push({
      text,
      className: classes.join(" "),
      style: Object.keys(style).length > 0 ? style : undefined,
    });
  }

  return segments;
}

function blockClassName(message: MessageDraft, readOnly: boolean) {
  const blockType = getMessageEditorBlockType(message);
  const base = [
    "relative rounded-md px-3 py-1.5 transition selection:bg-sky-200 selection:text-slate-950",
    "bg-transparent",
    readOnly ? "" : "hover:bg-base-200/30",
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
  placeholder = "",
  readOnly = false,
  registerBlockRef,
}: MessageEditorTextBlockProps) {
  const content = normalizeMessageEditorContent(message.content);
  const segments = buildInlineSegments(message);
  const blockContentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = blockContentRef.current;
    if (!node) {
      return;
    }

    const normalizedDomText = normalizeEditableText(node.textContent ?? "");
    if (!readOnly && active) {
      if (!content) {
        if (node.childNodes.length === 1 && node.firstChild instanceof HTMLBRElement) {
          return;
        }
        node.replaceChildren(document.createElement("br"));
        return;
      }

      if (normalizedDomText === content) {
        return;
      }

      node.replaceChildren(document.createTextNode(content));
      return;
    }

    if (normalizedDomText === content && node.childNodes.length === segments.length) {
      return;
    }

    if (!content) {
      node.replaceChildren();
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const segment of segments) {
      const span = document.createElement("span");
      span.className = segment.className;
      span.textContent = segment.text;
      if (segment.style?.backgroundColor) {
        span.style.backgroundColor = segment.style.backgroundColor;
      }
      if (segment.style?.color) {
        span.style.color = segment.style.color;
      }
      fragment.append(span);
    }
    node.replaceChildren(fragment);
  }, [active, content, readOnly, segments]);

  return (
    <div className={blockClassName(message, readOnly)}>
      {!content && !active && !readOnly && (
        <div className="pointer-events-none absolute inset-x-3 top-1.5 text-base-content/25">
          {placeholder}
        </div>
      )}
      <div
        ref={(node) => {
          blockContentRef.current = node;
          registerBlockRef(blockId, node);
        }}
        data-me-block-id={blockId}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        className="min-h-6 whitespace-pre-wrap break-words outline-none selection:bg-sky-200 selection:text-slate-950"
        onMouseDownCapture={() => {
          if (!readOnly) {
            onFocus(blockId);
          }
        }}
        onFocus={() => onFocus(blockId)}
        onBlur={() => onBlur?.(blockId)}
        onInput={(event) => {
          onInput(blockId, normalizeEditableText(event.currentTarget.textContent ?? ""));
        }}
        onKeyDown={event => onKeyDown(blockId, event)}
      />
    </div>
  );
}
