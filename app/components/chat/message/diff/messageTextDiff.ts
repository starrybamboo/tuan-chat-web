export type MessageTextDiffSegmentKind = "equal" | "insert" | "delete";

export interface MessageTextDiffSegment {
  kind: MessageTextDiffSegmentKind;
  text: string;
}

export interface MessageTextDiffSummary {
  insertedChars: number;
  deletedChars: number;
  unchangedChars: number;
}

export interface MessageTextDiff {
  beforeText: string;
  afterText: string;
  segments: MessageTextDiffSegment[];
  beforeSegments: MessageTextDiffSegment[];
  afterSegments: MessageTextDiffSegment[];
  hasChanges: boolean;
  summary: MessageTextDiffSummary;
}

const MESSAGE_TEXT_TOKEN_PATTERN = /\s+|[\p{Script=Han}]|[\p{Letter}\p{Number}_]+|./gu;

function tokenizeMessageText(input: string): string[] {
  if (!input) {
    return [];
  }
  return input.match(MESSAGE_TEXT_TOKEN_PATTERN) ?? Array.from(input);
}

function mergeSegments(segments: MessageTextDiffSegment[]): MessageTextDiffSegment[] {
  if (segments.length === 0) {
    return [];
  }

  const merged: MessageTextDiffSegment[] = [];
  for (const segment of segments) {
    if (!segment.text) {
      continue;
    }
    const previous = merged[merged.length - 1];
    if (previous?.kind === segment.kind) {
      previous.text += segment.text;
      continue;
    }
    merged.push({ ...segment });
  }
  return merged;
}

function buildLcsMatrix(beforeTokens: string[], afterTokens: string[]): Uint16Array[] {
  const rowCount = beforeTokens.length + 1;
  const matrix = Array.from({ length: rowCount }, () => new Uint16Array(afterTokens.length + 1));

  for (let beforeIndex = 1; beforeIndex <= beforeTokens.length; beforeIndex += 1) {
    for (let afterIndex = 1; afterIndex <= afterTokens.length; afterIndex += 1) {
      if (beforeTokens[beforeIndex - 1] === afterTokens[afterIndex - 1]) {
        matrix[beforeIndex]![afterIndex] = (matrix[beforeIndex - 1]![afterIndex - 1] ?? 0) + 1;
        continue;
      }
      matrix[beforeIndex]![afterIndex] = Math.max(
        matrix[beforeIndex - 1]![afterIndex] ?? 0,
        matrix[beforeIndex]![afterIndex - 1] ?? 0,
      );
    }
  }

  return matrix;
}

function buildDiffSegments(beforeTokens: string[], afterTokens: string[]): MessageTextDiffSegment[] {
  const matrix = buildLcsMatrix(beforeTokens, afterTokens);
  const reversedSegments: MessageTextDiffSegment[] = [];

  let beforeIndex = beforeTokens.length;
  let afterIndex = afterTokens.length;
  while (beforeIndex > 0 || afterIndex > 0) {
    if (
      beforeIndex > 0
      && afterIndex > 0
      && beforeTokens[beforeIndex - 1] === afterTokens[afterIndex - 1]
    ) {
      reversedSegments.push({
        kind: "equal",
        text: beforeTokens[beforeIndex - 1]!,
      });
      beforeIndex -= 1;
      afterIndex -= 1;
      continue;
    }

    const up = beforeIndex > 0 ? (matrix[beforeIndex - 1]![afterIndex] ?? 0) : -1;
    const left = afterIndex > 0 ? (matrix[beforeIndex]![afterIndex - 1] ?? 0) : -1;
    if (beforeIndex > 0 && up >= left) {
      reversedSegments.push({
        kind: "delete",
        text: beforeTokens[beforeIndex - 1]!,
      });
      beforeIndex -= 1;
      continue;
    }
    if (afterIndex > 0) {
      reversedSegments.push({
        kind: "insert",
        text: afterTokens[afterIndex - 1]!,
      });
      afterIndex -= 1;
    }
  }

  return mergeSegments(reversedSegments.reverse());
}

function buildSummary(segments: MessageTextDiffSegment[]): MessageTextDiffSummary {
  return segments.reduce<MessageTextDiffSummary>((summary, segment) => {
    if (segment.kind === "equal") {
      summary.unchangedChars += segment.text.length;
    }
    else if (segment.kind === "insert") {
      summary.insertedChars += segment.text.length;
    }
    else {
      summary.deletedChars += segment.text.length;
    }
    return summary;
  }, {
    insertedChars: 0,
    deletedChars: 0,
    unchangedChars: 0,
  });
}

export function buildMessageTextDiff(beforeText: string, afterText: string): MessageTextDiff {
  const normalizedBeforeText = beforeText ?? "";
  const normalizedAfterText = afterText ?? "";
  const segments = buildDiffSegments(
    tokenizeMessageText(normalizedBeforeText),
    tokenizeMessageText(normalizedAfterText),
  );
  const summary = buildSummary(segments);

  return {
    beforeText: normalizedBeforeText,
    afterText: normalizedAfterText,
    segments,
    beforeSegments: segments.filter(segment => segment.kind !== "insert"),
    afterSegments: segments.filter(segment => segment.kind !== "delete"),
    hasChanges: summary.insertedChars > 0 || summary.deletedChars > 0,
    summary,
  };
}
