export function mergeTagString(base: string, extraTags: string[]) {
  const value = String(base || "");
  const list = value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  const uniq = new Set<string>();
  for (const item of [...extraTags, ...list]) {
    const normalized = String(item || "").trim();
    if (!normalized)
      continue;
    uniq.add(normalized);
  }

  return Array.from(uniq).join(", ");
}

export function stripNovelAiLineComments(value: string) {
  const raw = String(value ?? "");
  if (!raw)
    return "";

  const lines = raw.split("\n");
  const kept = lines.filter(line => !line.trimStart().startsWith("//"));
  return kept.join("\n");
}

export function sanitizeNovelAiTagInput(value: string) {
  return stripNovelAiLineComments(value).trim();
}

function clampSelectionIndex(value: string, index: number | null | undefined) {
  const fallback = value.length;
  const numericIndex = Number(index);
  if (!Number.isFinite(numericIndex))
    return fallback;
  return Math.min(value.length, Math.max(0, Math.floor(numericIndex)));
}

type NovelAiLineCommentToggleResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

function getLineIndentSize(line: string) {
  const match = line.match(/^[\t ]*/);
  return match ? match[0].length : 0;
}

function isLineCommented(line: string, indentSize: number) {
  return line.slice(indentSize).startsWith("//");
}

function splitLinesWithMeta(value: string) {
  const lines: Array<{ start: number; end: number; text: string; hasNewline: boolean }> = [];
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "\n")
      continue;
    lines.push({
      start,
      end: index,
      text: value.slice(start, index),
      hasNewline: true,
    });
    start = index + 1;
  }
  lines.push({
    start,
    end: value.length,
    text: value.slice(start),
    hasNewline: false,
  });
  return lines;
}

function findLineIndexAt(lines: Array<{ start: number; end: number }>, pos: number) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (pos < line.start)
      continue;
    if (pos <= line.end)
      return index;
  }
  return Math.max(0, lines.length - 1);
}

export function toggleNovelAiLineComments(args: {
  value: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}): NovelAiLineCommentToggleResult {
  const currentValue = String(args.value ?? "");
  const rawStart = clampSelectionIndex(currentValue, args.selectionStart);
  const rawEnd = clampSelectionIndex(currentValue, args.selectionEnd);
  const selectionStart = Math.min(rawStart, rawEnd);
  const selectionEnd = Math.max(rawStart, rawEnd);

  const lines = splitLinesWithMeta(currentValue);
  const effectiveSelectionEnd = selectionEnd > selectionStart && selectionEnd > 0 && currentValue[selectionEnd - 1] === "\n"
    ? selectionEnd - 1
    : selectionEnd;
  const startLineIndex = findLineIndexAt(lines, selectionStart);
  const endLineIndex = findLineIndexAt(lines, effectiveSelectionEnd);

  const targetLines = lines.slice(startLineIndex, endLineIndex + 1);
  const nonEmptyTargetLines = targetLines.filter(line => line.text.trim().length > 0);
  const shouldUncomment = nonEmptyTargetLines.length > 0
    && nonEmptyTargetLines.every((line) => {
      const indentSize = getLineIndentSize(line.text);
      return isLineCommented(line.text, indentSize);
    });

  type EditedLine = {
    oldStart: number;
    oldEnd: number;
    hasNewline: boolean;
    oldText: string;
    newText: string;
    newStart: number;
    editPos: number;
    insertLen: number;
    removeLen: number;
  };

  const editedLines: EditedLine[] = lines.map((line, index) => {
    if (index < startLineIndex || index > endLineIndex) {
      return {
        oldStart: line.start,
        oldEnd: line.end,
        hasNewline: line.hasNewline,
        oldText: line.text,
        newText: line.text,
        newStart: 0,
        editPos: 0,
        insertLen: 0,
        removeLen: 0,
      };
    }

    const indentSize = getLineIndentSize(line.text);
    const commented = isLineCommented(line.text, indentSize);

    if (shouldUncomment) {
      if (!commented) {
        return {
          oldStart: line.start,
          oldEnd: line.end,
          hasNewline: line.hasNewline,
          oldText: line.text,
          newText: line.text,
          newStart: 0,
          editPos: indentSize,
          insertLen: 0,
          removeLen: 0,
        };
      }

      const afterIndent = line.text.slice(indentSize);
      const removeLen = afterIndent.startsWith("// ")
        ? 3
        : 2;
      const newText = `${line.text.slice(0, indentSize)}${afterIndent.slice(removeLen)}`;
      return {
        oldStart: line.start,
        oldEnd: line.end,
        hasNewline: line.hasNewline,
        oldText: line.text,
        newText,
        newStart: 0,
        editPos: indentSize,
        insertLen: 0,
        removeLen,
      };
    }

    if (commented) {
      return {
        oldStart: line.start,
        oldEnd: line.end,
        hasNewline: line.hasNewline,
        oldText: line.text,
        newText: line.text,
        newStart: 0,
        editPos: indentSize,
        insertLen: 0,
        removeLen: 0,
      };
    }

    const insert = line.text.trim().length ? "// " : "//";
    const newText = `${line.text.slice(0, indentSize)}${insert}${line.text.slice(indentSize)}`;
    return {
      oldStart: line.start,
      oldEnd: line.end,
      hasNewline: line.hasNewline,
      oldText: line.text,
      newText,
      newStart: 0,
      editPos: indentSize,
      insertLen: insert.length,
      removeLen: 0,
    };
  });

  let cursor = 0;
  for (const line of editedLines) {
    line.newStart = cursor;
    cursor += line.newText.length;
    if (line.hasNewline)
      cursor += 1;
  }

  const nextValue = editedLines.map(line => `${line.newText}${line.hasNewline ? "\n" : ""}`).join("");

  function mapPos(pos: number) {
    const clamped = Math.min(currentValue.length, Math.max(0, Math.floor(pos)));
    const lineIndex = findLineIndexAt(lines, clamped);
    const line = editedLines[lineIndex] ?? editedLines[editedLines.length - 1];
    const oldOffset = clamped - line.oldStart;
    let nextOffset = oldOffset;

    if (line.insertLen > 0) {
      if (oldOffset > line.editPos)
        nextOffset = oldOffset + line.insertLen;
    }
    else if (line.removeLen > 0) {
      if (oldOffset <= line.editPos) {
        nextOffset = oldOffset;
      }
      else if (oldOffset <= line.editPos + line.removeLen) {
        nextOffset = line.editPos;
      }
      else {
        nextOffset = Math.max(line.editPos, oldOffset - line.removeLen);
      }
    }

    return Math.min(nextValue.length, Math.max(0, line.newStart + nextOffset));
  }

  return {
    value: nextValue,
    selectionStart: mapPos(selectionStart),
    selectionEnd: mapPos(selectionEnd),
  };
}

export function cleanImportedPromptText(value: string) {
  return String(value || "")
    .replace(/[[\]{}]/g, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
