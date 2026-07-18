import type { MutableRefObject, TextareaHTMLAttributes } from "react";

import { useCallback, useId } from "react";

import { TextArea } from "@/components/common/FormField";

type SegmentTone = "neutral" | "strengthen" | "weaken" | "inverse";
type SegmentKind = "text" | "syntax" | "numeric-close" | "comment";

type EmphasisSegment = {
  text: string;
  kind: SegmentKind;
  tone: SegmentTone;
  level: 0 | 1 | 2 | 3;
}

type HighlightEmphasisTextareaProps = {
  contentClassName: string;
  highlightEnabled?: boolean;
  surfaceClassName: string;
  textareaRef?: MutableRefObject<HTMLTextAreaElement | null>;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">

const NUMERIC_EMPHASIS_PATTERN = /^-?(?:\d+(?:\.\d+)?|\.\d+)::/;
// The overlay must keep identical text metrics to the real textarea, otherwise
// emphasized spans change width and the caret appears to drift while typing.
const COMMENT_CLASS_NAME = "text-base-content/50 dark:text-base-content/50";
const NUMERIC_CLOSE_CLASS_NAME = "bg-emerald-400/82 text-emerald-950 dark:bg-emerald-400/36 dark:text-emerald-50";

const SEGMENT_CLASS_MAP: Record<SegmentTone, Record<0 | 1 | 2 | 3, { syntax: string; text: string }>> = {
  neutral: {
    0: {
      syntax: "text-base-content/50 dark:text-base-content/50",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "text-base-content/50 dark:text-base-content/50",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    2: {
      syntax: "text-base-content/50 dark:text-base-content/50",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    3: {
      syntax: "text-base-content/50 dark:text-base-content/50",
      text: "text-base-content/90 dark:text-base-content/90",
    },
  },
  strengthen: {
    0: {
      syntax: "text-base-content/50 dark:text-base-content/50",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "bg-amber-400/78 text-amber-950 dark:bg-amber-400/32 dark:text-amber-50",
      text: "bg-amber-400/78 text-amber-950 dark:bg-amber-400/32 dark:text-amber-50",
    },
    2: {
      syntax: "bg-orange-400/82 text-orange-950 dark:bg-orange-400/36 dark:text-orange-50",
      text: "bg-orange-400/82 text-orange-950 dark:bg-orange-400/36 dark:text-orange-50",
    },
    3: {
      syntax: "bg-rose-400/84 text-rose-950 dark:bg-rose-400/42 dark:text-rose-50",
      text: "bg-rose-400/84 text-rose-950 dark:bg-rose-400/42 dark:text-rose-50",
    },
  },
  weaken: {
    0: {
      syntax: "text-base-content/50 dark:text-base-content/50",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "bg-sky-400/72 text-sky-950 dark:bg-sky-400/28 dark:text-sky-50",
      text: "bg-sky-400/72 text-sky-950 dark:bg-sky-400/28 dark:text-sky-50",
    },
    2: {
      syntax: "bg-blue-400/78 text-blue-950 dark:bg-blue-400/34 dark:text-blue-50",
      text: "bg-blue-400/78 text-blue-950 dark:bg-blue-400/34 dark:text-blue-50",
    },
    3: {
      syntax: "bg-indigo-400/82 text-indigo-950 dark:bg-indigo-400/38 dark:text-indigo-50",
      text: "bg-indigo-400/82 text-indigo-950 dark:bg-indigo-400/38 dark:text-indigo-50",
    },
  },
  inverse: {
    0: {
      syntax: "text-base-content/50 dark:text-base-content/50",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "bg-fuchsia-400/76 text-fuchsia-950 dark:bg-fuchsia-400/30 dark:text-fuchsia-50",
      text: "bg-fuchsia-400/76 text-fuchsia-950 dark:bg-fuchsia-400/30 dark:text-fuchsia-50",
    },
    2: {
      syntax: "bg-pink-400/82 text-pink-950 dark:bg-pink-400/36 dark:text-pink-50",
      text: "bg-pink-400/82 text-pink-950 dark:bg-pink-400/36 dark:text-pink-50",
    },
    3: {
      syntax: "bg-rose-400/86 text-rose-950 dark:bg-rose-400/44 dark:text-rose-50",
      text: "bg-rose-400/86 text-rose-950 dark:bg-rose-400/44 dark:text-rose-50",
    },
  },
};

function resolveSegmentTone(weight: number): { level: 0 | 1 | 2 | 3; tone: SegmentTone } {
  if (weight < 0) {
    const absoluteWeight = Math.abs(weight);
    if (absoluteWeight >= 1.5)
      return { tone: "inverse", level: 3 };
    if (absoluteWeight >= 0.75)
      return { tone: "inverse", level: 2 };
    return { tone: "inverse", level: 1 };
  }

  if (weight > 1.001) {
    if (weight >= 1.5)
      return { tone: "strengthen", level: 3 };
    if (weight >= 1.15)
      return { tone: "strengthen", level: 2 };
    return { tone: "strengthen", level: 1 };
  }

  if (weight < 0.999) {
    if (weight <= 0.4)
      return { tone: "weaken", level: 3 };
    if (weight <= 0.8)
      return { tone: "weaken", level: 2 };
    return { tone: "weaken", level: 1 };
  }

  return { tone: "neutral", level: 0 };
}

function resolveSegmentClassName(kind: SegmentKind, tone: SegmentTone, level: 0 | 1 | 2 | 3) {
  if (kind === "comment")
    return COMMENT_CLASS_NAME;
  if (kind === "numeric-close")
    return NUMERIC_CLOSE_CLASS_NAME;
  return SEGMENT_CLASS_MAP[tone][level][kind === "syntax" ? "syntax" : "text"];
}

function isNumericEmphasisBoundary(value: string, index: number) {
  if (index <= 0)
    return true;

  const previousCharacter = value[index - 1];
  return !/[\p{L}\p{N}_]/u.test(previousCharacter);
}

function matchWholeLineComment(value: string, index: number) {
  if (index > 0 && value[index - 1] !== "\n")
    return null;

  const lineEnd = value.indexOf("\n", index);
  const lineText = value.slice(index, lineEnd === -1 ? value.length : lineEnd);
  return lineText.trimStart().startsWith("//") ? lineText : null;
}

export function parseNovelAiSegments(value: string) {
  const segments: EmphasisSegment[] = [];
  let curlyDepth = 0;
  let squareDepth = 0;
  const numericWeights: number[] = [];

  function getCurrentWeight() {
    const numericWeight = numericWeights.reduce((product, current) => product * current, 1);
    return numericWeight * (1.05 ** (curlyDepth - squareDepth));
  }

  function pushSegment(text: string, kind: SegmentKind, weightOverride?: number) {
    if (!text)
      return;

    const { level, tone } = resolveSegmentTone(weightOverride ?? getCurrentWeight());
    const nextClassName = resolveSegmentClassName(kind, tone, level);
    const previousSegment = segments[segments.length - 1];
    if (
      previousSegment
      && previousSegment.kind !== "numeric-close"
      && kind !== "numeric-close"
      && previousSegment.tone === tone
      && previousSegment.level === level
      && resolveSegmentClassName(previousSegment.kind, previousSegment.tone, previousSegment.level) === nextClassName
    ) {
      previousSegment.text += text;
      return;
    }

    segments.push({
      text,
      kind,
      tone,
      level,
    });
  }

  let index = 0;
  while (index < value.length) {
    const lineComment = matchWholeLineComment(value, index);
    if (lineComment != null) {
      pushSegment(lineComment, "comment");
      index += lineComment.length;
      continue;
    }

    const rest = value.slice(index);
    const numericMatch = rest.match(NUMERIC_EMPHASIS_PATTERN);
    if (numericMatch && isNumericEmphasisBoundary(value, index)) {
      const numericWeight = Number(numericMatch[0].slice(0, -2));
      pushSegment(numericMatch[0], "syntax", getCurrentWeight() * numericWeight);
      numericWeights.push(numericWeight);
      index += numericMatch[0].length;
      continue;
    }

    if (rest.startsWith("::") && numericWeights.length) {
      pushSegment("::", "numeric-close");
      numericWeights.pop();
      index += 2;
      continue;
    }

    const currentCharacter = value[index];
    if (currentCharacter === "{") {
      pushSegment(currentCharacter, "syntax", getCurrentWeight() * 1.05);
      curlyDepth += 1;
      index += 1;
      continue;
    }

    if (currentCharacter === "}") {
      pushSegment(currentCharacter, "syntax", getCurrentWeight());
      curlyDepth = Math.max(0, curlyDepth - 1);
      index += 1;
      continue;
    }

    if (currentCharacter === "[") {
      pushSegment(currentCharacter, "syntax", getCurrentWeight() / 1.05);
      squareDepth += 1;
      index += 1;
      continue;
    }

    if (currentCharacter === "]") {
      pushSegment(currentCharacter, "syntax", getCurrentWeight());
      squareDepth = Math.max(0, squareDepth - 1);
      index += 1;
      continue;
    }

    pushSegment(currentCharacter, "text");
    index += 1;
  }

  return segments;
}

export function HighlightEmphasisTextarea({
  contentClassName,
  highlightEnabled = true,
  onChange,
  onScroll,
  placeholder,
  readOnly,
  spellCheck = false,
  surfaceClassName,
  textareaRef,
  value,
  "aria-label": ariaLabel,
  ...textareaProps
}: HighlightEmphasisTextareaProps) {
  const textareaId = useId();
  const stringValue = typeof value === "string" ? value : String(value ?? "");
  const segments = parseNovelAiSegments(stringValue);

  const handleTextareaRef = useCallback((node: HTMLTextAreaElement | null) => {
    if (textareaRef)
      textareaRef.current = node;
  }, [textareaRef]);

  return (
    <div className={`${surfaceClassName} grid`}>
      <div
        aria-hidden="true"
        className={`
          pointer-events-none col-start-1 row-start-1 overflow-hidden
          ${highlightEnabled ? "visible" : "invisible"}
        `}
      >
        <div className={`
          ${contentClassName}
          min-h-full whitespace-pre-wrap break-words
        `}>
          {segments.length
            ? segments.map((segment, index) => (
                <span key={`${index}-${segment.kind}`} className={resolveSegmentClassName(segment.kind, segment.tone, segment.level)}>
                  {segment.text}
                </span>
              ))
            : <span className="
              text-base-content/28
              dark:text-base-content/28
            ">{placeholder ?? ""}</span>}
          {stringValue.endsWith("\n") ? "\n " : null}
        </div>
      </div>

      <TextArea
        {...textareaProps}
        appearance="bare"
        id={textareaId}
        ref={handleTextareaRef}
        aria-label={ariaLabel ?? placeholder}
        readOnly={readOnly}
        spellCheck={spellCheck}
        value={stringValue}
        placeholder={highlightEnabled ? "" : placeholder}
        className={`
          ${contentClassName}
          relative z-10 col-start-1 row-start-1 block h-full w-full resize-none
          whitespace-pre-wrap break-words overflow-hidden bg-transparent
          focus:outline-none focus:ring-0 focus:shadow-none
          ${
          highlightEnabled
            ? `
              text-transparent caret-base-content
              selection:bg-info/20
              placeholder:text-transparent
            `
            : "text-base-content"
        }
        `}
        onChange={onChange}
        onScroll={onScroll}
      />
    </div>
  );
}
