import type { TextareaHTMLAttributes } from "react";
import { useEffect, useId, useLayoutEffect, useRef } from "react";

type SegmentTone = "neutral" | "strengthen" | "weaken" | "inverse";

interface EmphasisSegment {
  text: string;
  tone: SegmentTone;
  level: 0 | 1 | 2 | 3;
  syntax: boolean;
}

interface HighlightEmphasisTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  contentClassName: string;
  highlightEnabled?: boolean;
  surfaceClassName: string;
}

const NUMERIC_EMPHASIS_PATTERN = /^-?(?:\d+(?:\.\d+)?|\.\d+)::/;

const SEGMENT_CLASS_MAP: Record<SegmentTone, Record<0 | 1 | 2 | 3, { syntax: string; text: string }>> = {
  neutral: {
    0: {
      syntax: "text-base-content/35 dark:text-base-content/35",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "text-base-content/35 dark:text-base-content/35",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    2: {
      syntax: "text-base-content/35 dark:text-base-content/35",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    3: {
      syntax: "text-base-content/35 dark:text-base-content/35",
      text: "text-base-content/90 dark:text-base-content/90",
    },
  },
  strengthen: {
    0: {
      syntax: "text-base-content/35 dark:text-base-content/35",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "text-amber-800 dark:text-amber-100",
      text: "rounded-sm bg-amber-300/70 text-amber-950 dark:bg-amber-300/24 dark:text-amber-50",
    },
    2: {
      syntax: "text-orange-800 dark:text-orange-100",
      text: "rounded-sm bg-orange-300/75 font-medium text-orange-950 dark:bg-orange-300/28 dark:text-orange-50",
    },
    3: {
      syntax: "text-rose-800 dark:text-rose-100",
      text: "rounded-sm bg-rose-300/80 font-semibold text-rose-950 dark:bg-rose-300/34 dark:text-rose-50",
    },
  },
  weaken: {
    0: {
      syntax: "text-base-content/35 dark:text-base-content/35",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "text-sky-800 dark:text-sky-100",
      text: "rounded-sm bg-sky-300/60 text-sky-950 dark:bg-sky-300/20 dark:text-sky-50",
    },
    2: {
      syntax: "text-blue-800 dark:text-blue-100",
      text: "rounded-sm bg-blue-300/68 font-medium text-blue-950 dark:bg-blue-300/24 dark:text-blue-50",
    },
    3: {
      syntax: "text-indigo-800 dark:text-indigo-100",
      text: "rounded-sm bg-indigo-300/72 font-medium text-indigo-950 dark:bg-indigo-300/28 dark:text-indigo-50",
    },
  },
  inverse: {
    0: {
      syntax: "text-base-content/35 dark:text-base-content/35",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "text-fuchsia-800 dark:text-fuchsia-100",
      text: "rounded-sm bg-fuchsia-300/68 text-fuchsia-950 dark:bg-fuchsia-300/22 dark:text-fuchsia-50",
    },
    2: {
      syntax: "text-pink-800 dark:text-pink-100",
      text: "rounded-sm bg-pink-300/75 font-medium text-pink-950 dark:bg-pink-300/28 dark:text-pink-50",
    },
    3: {
      syntax: "text-rose-800 dark:text-rose-50",
      text: "rounded-sm bg-rose-300/82 font-semibold text-rose-950 dark:bg-rose-300/36 dark:text-rose-50",
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

function createSegmentClassName(segment: EmphasisSegment) {
  return SEGMENT_CLASS_MAP[segment.tone][segment.level][segment.syntax ? "syntax" : "text"];
}

function parseNovelAiSegments(value: string) {
  const segments: EmphasisSegment[] = [];
  let curlyDepth = 0;
  let squareDepth = 0;
  const numericWeights: number[] = [];

  function getCurrentWeight() {
    const numericWeight = numericWeights.reduce((product, current) => product * current, 1);
    return numericWeight * (1.05 ** (curlyDepth - squareDepth));
  }

  function pushSegment(text: string, syntax: boolean, weightOverride?: number) {
    if (!text)
      return;

    const { level, tone } = resolveSegmentTone(weightOverride ?? getCurrentWeight());
    const previousSegment = segments[segments.length - 1];
    if (
      previousSegment
      && previousSegment.level === level
      && previousSegment.syntax === syntax
      && previousSegment.tone === tone
    ) {
      previousSegment.text += text;
      return;
    }

    segments.push({
      text,
      tone,
      level,
      syntax,
    });
  }

  let index = 0;
  while (index < value.length) {
    const rest = value.slice(index);
    const numericMatch = rest.match(NUMERIC_EMPHASIS_PATTERN);
    if (numericMatch) {
      const numericWeight = Number(numericMatch[0].slice(0, -2));
      pushSegment(numericMatch[0], true, getCurrentWeight() * numericWeight);
      numericWeights.push(numericWeight);
      index += numericMatch[0].length;
      continue;
    }

    if (rest.startsWith("::") && numericWeights.length) {
      pushSegment("::", true, getCurrentWeight());
      numericWeights.pop();
      index += 2;
      continue;
    }

    const currentCharacter = value[index];
    if (currentCharacter === "{") {
      pushSegment(currentCharacter, true, getCurrentWeight() * 1.05);
      curlyDepth += 1;
      index += 1;
      continue;
    }

    if (currentCharacter === "}") {
      pushSegment(currentCharacter, true, getCurrentWeight());
      curlyDepth = Math.max(0, curlyDepth - 1);
      index += 1;
      continue;
    }

    if (currentCharacter === "[") {
      pushSegment(currentCharacter, true, getCurrentWeight() / 1.05);
      squareDepth += 1;
      index += 1;
      continue;
    }

    if (currentCharacter === "]") {
      pushSegment(currentCharacter, true, getCurrentWeight());
      squareDepth = Math.max(0, squareDepth - 1);
      index += 1;
      continue;
    }

    pushSegment(currentCharacter, false);
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
  value,
  ...textareaProps
}: HighlightEmphasisTextareaProps) {
  const overlayContentRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previousHeightRef = useRef(0);
  const textareaId = useId();
  const stringValue = typeof value === "string" ? value : String(value ?? "");
  const segments = parseNovelAiSegments(stringValue);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea)
      return;

    textarea.style.height = "0px";
    const nextHeight = Math.max(textarea.scrollHeight, textarea.rows ? textarea.rows * 24 : 0);
    if (previousHeightRef.current !== nextHeight) {
      previousHeightRef.current = nextHeight;
      textarea.style.height = `${nextHeight}px`;
      return;
    }
    textarea.style.height = `${nextHeight}px`;
  }, [contentClassName, stringValue]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver !== "function")
      return;

    const observer = new ResizeObserver(() => {
      textarea.style.height = "0px";
      const nextHeight = Math.max(textarea.scrollHeight, textarea.rows ? textarea.rows * 24 : 0);
      if (previousHeightRef.current === nextHeight) {
        textarea.style.height = `${nextHeight}px`;
        return;
      }
      previousHeightRef.current = nextHeight;
      textarea.style.height = `${nextHeight}px`;
    });

    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={surfaceClassName}>
      {highlightEnabled
        ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                ref={overlayContentRef}
                className={`${contentClassName} min-h-full whitespace-pre-wrap break-words`}
              >
                {segments.length
                  ? segments.map((segment, index) => (
                      <span key={`${index}-${segment.syntax ? "syntax" : "text"}`} className={createSegmentClassName(segment)}>
                        {segment.text}
                      </span>
                    ))
                  : <span className="text-base-content/28 dark:text-base-content/28">{placeholder ?? ""}</span>}
                {stringValue.endsWith("\n") ? "\n " : null}
              </div>
            </div>
          )
        : null}

      <textarea
        {...textareaProps}
        id={textareaId}
        ref={textareaRef}
        readOnly={readOnly}
        spellCheck={spellCheck}
        value={stringValue}
        placeholder={highlightEnabled ? "" : placeholder}
        className={`${contentClassName} relative z-10 block w-full resize-none overflow-hidden bg-transparent focus:outline-none ${
          highlightEnabled
            ? "text-transparent caret-base-content selection:bg-primary/20 placeholder:text-transparent"
            : "text-base-content"
        }`}
        onChange={onChange}
        onScroll={onScroll}
      />
    </div>
  );
}
