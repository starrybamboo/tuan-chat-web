import type { TextareaHTMLAttributes } from "react";
import { useEffect, useId, useRef } from "react";

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
      syntax: "text-amber-700/80 dark:text-amber-200/80",
      text: "rounded-sm bg-amber-200/45 text-amber-950 dark:bg-amber-300/15 dark:text-amber-50",
    },
    2: {
      syntax: "text-orange-700/85 dark:text-orange-200/85",
      text: "rounded-sm bg-orange-200/55 font-medium text-orange-950 dark:bg-orange-300/18 dark:text-orange-50",
    },
    3: {
      syntax: "text-rose-700/90 dark:text-rose-200/90",
      text: "rounded-sm bg-rose-200/60 font-semibold text-rose-950 dark:bg-rose-300/20 dark:text-rose-50",
    },
  },
  weaken: {
    0: {
      syntax: "text-base-content/35 dark:text-base-content/35",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "text-sky-700/80 dark:text-sky-200/80",
      text: "rounded-sm bg-sky-200/40 text-sky-950 dark:bg-sky-300/14 dark:text-sky-50",
    },
    2: {
      syntax: "text-blue-700/85 dark:text-blue-200/85",
      text: "rounded-sm bg-blue-200/45 font-medium text-blue-950 dark:bg-blue-300/16 dark:text-blue-50",
    },
    3: {
      syntax: "text-indigo-700/90 dark:text-indigo-200/90",
      text: "rounded-sm bg-indigo-200/50 font-medium text-indigo-950 dark:bg-indigo-300/18 dark:text-indigo-50",
    },
  },
  inverse: {
    0: {
      syntax: "text-base-content/35 dark:text-base-content/35",
      text: "text-base-content/90 dark:text-base-content/90",
    },
    1: {
      syntax: "text-fuchsia-700/85 dark:text-fuchsia-200/85",
      text: "rounded-sm bg-fuchsia-200/45 text-fuchsia-950 dark:bg-fuchsia-300/15 dark:text-fuchsia-50",
    },
    2: {
      syntax: "text-pink-700/90 dark:text-pink-200/90",
      text: "rounded-sm bg-pink-200/55 font-medium text-pink-950 dark:bg-pink-300/18 dark:text-pink-50",
    },
    3: {
      syntax: "text-rose-700/95 dark:text-rose-100/95",
      text: "rounded-sm bg-rose-200/65 font-semibold text-rose-950 dark:bg-rose-300/22 dark:text-rose-50",
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

  function pushSegment(text: string, syntax: boolean) {
    if (!text)
      return;

    const { level, tone } = resolveSegmentTone(getCurrentWeight());
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
      pushSegment(numericMatch[0], true);
      numericWeights.push(Number(numericMatch[0].slice(0, -2)));
      index += numericMatch[0].length;
      continue;
    }

    if (rest.startsWith("::") && numericWeights.length) {
      numericWeights.pop();
      pushSegment("::", true);
      index += 2;
      continue;
    }

    const currentCharacter = value[index];
    if (currentCharacter === "{") {
      pushSegment(currentCharacter, true);
      curlyDepth += 1;
      index += 1;
      continue;
    }

    if (currentCharacter === "}") {
      curlyDepth = Math.max(0, curlyDepth - 1);
      pushSegment(currentCharacter, true);
      index += 1;
      continue;
    }

    if (currentCharacter === "[") {
      pushSegment(currentCharacter, true);
      squareDepth += 1;
      index += 1;
      continue;
    }

    if (currentCharacter === "]") {
      squareDepth = Math.max(0, squareDepth - 1);
      pushSegment(currentCharacter, true);
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
  const textareaId = useId();
  const stringValue = typeof value === "string" ? value : String(value ?? "");
  const segments = parseNovelAiSegments(stringValue);

  useEffect(() => {
    if (!highlightEnabled || !overlayContentRef.current || !textareaRef.current)
      return;

    overlayContentRef.current.style.transform = `translate(${-textareaRef.current.scrollLeft}px, ${-textareaRef.current.scrollTop}px)`;
  }, [highlightEnabled, stringValue]);

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
        className={`${contentClassName} relative z-10 h-full w-full resize-none bg-transparent focus:outline-none ${
          highlightEnabled
            ? "text-transparent caret-base-content selection:bg-primary/20 placeholder:text-transparent"
            : "text-base-content"
        }`}
        onChange={onChange}
        onScroll={(event) => {
          if (highlightEnabled && overlayContentRef.current) {
            overlayContentRef.current.style.transform = `translate(${-event.currentTarget.scrollLeft}px, ${-event.currentTarget.scrollTop}px)`;
          }
          onScroll?.(event);
        }}
      />
    </div>
  );
}
