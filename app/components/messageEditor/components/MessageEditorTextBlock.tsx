import type { MessageDraft } from "@/types/messageDraft";

import {
  getMessageEditorBlockType,
  getMessageEditorInlineMarks,
  normalizeMessageEditorContent,
} from "../model/messageEditorTransforms";

interface MessageEditorTextBlockProps {
  active: boolean;
  blockId: string;
  message: MessageDraft;
  onFocus: (blockId: string) => void;
  onInput: (blockId: string, nextContent: string) => void;
  onKeyDown: (blockId: string, event: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
  registerBlockRef: (blockId: string, node: HTMLDivElement | null) => void;
}

interface InlineSegment {
  key: string;
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
      key: `${start}:${end}`,
      text,
      className: classes.join(" "),
      style: Object.keys(style).length > 0 ? style : undefined,
    });
  }

  return segments;
}

function blockClassName(message: MessageDraft, active: boolean, readOnly: boolean) {
  const blockType = getMessageEditorBlockType(message);
  const base = [
    "relative rounded-md border px-3 py-2 transition",
    active ? "border-primary/50 bg-primary/5" : "border-transparent",
    readOnly ? "" : "hover:border-base-300",
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
    base.push("text-[15px] leading-7");
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
  onFocus,
  onInput,
  onKeyDown,
  placeholder = "",
  readOnly = false,
  registerBlockRef,
}: MessageEditorTextBlockProps) {
  const content = normalizeMessageEditorContent(message.content);
  const segments = buildInlineSegments(message);

  return (
    <div className={blockClassName(message, active, readOnly)}>
      {!content && !active && !readOnly && (
        <div className="pointer-events-none absolute inset-x-3 top-2 text-base-content/25">
          {placeholder}
        </div>
      )}
      <div
        ref={node => registerBlockRef(blockId, node)}
        data-me-block-id={blockId}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        className="min-h-7 whitespace-pre-wrap break-words outline-none"
        onFocus={() => onFocus(blockId)}
        onInput={(event) => {
          onInput(blockId, normalizeEditableText(event.currentTarget.textContent ?? ""));
        }}
        onKeyDown={event => onKeyDown(blockId, event)}
      >
        {segments.length > 0
          ? segments.map(segment => (
              <span key={segment.key} className={segment.className} style={segment.style}>
                {segment.text}
              </span>
            ))
          : (!readOnly ? <br /> : "")}
      </div>
    </div>
  );
}
