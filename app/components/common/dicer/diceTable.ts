import { roll } from "@/components/common/dicer/dice";

const DICE_TABLE_HIGHLIGHT_COLOR = "#FF6B00";
const DICE_TABLE_OPTION_PATTERN = /^\s*([0-9\uFF10\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18\uFF19]+)\s*(?:[.)）．。、,:：，]\s*|\s)(\S.*)$/;
const DICE_TABLE_FORCED_RESULT_PATTERN = /^([^:：=]+)[:：=]\s*(?:\[(\d+)\]|(\d+))$/;
const DICE_EXPRESSION_ONLY_PATTERN = /^[\dA-Z+\-*/()%.\s]+$/i;
const DICE_EXPRESSION_TOKEN_PATTERN = /\d*\s*d\s*(?:\d+|%)/i;
const DICE_FORCE_RESULT_SEARCH_PATTERN = /\d*\s*d\s*(?:\d+|%)\s*[:：=]\s*(?:\[\d+\]|\d+)/i;
const DICE_INLINE_WRAPPER_PATTERN = /【([^】\n\r]+)】|\[([^\]\n\r]+)\]/g;
const DICE_HIGHLIGHT_PATTERN = /\[\d+\]\(style=color:#FF6B00\)/;

type ParsedDiceExpression = {
  expression: string;
  forcedResult?: number;
  separator?: string;
  detail?: string;
};

function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function stripTextEnhanceSyntax(text: string) {
  return text.replace(/\((?:style|style-alltext|ruby)=[^)]+\)/gi, "");
}

function stripTextEnhanceSyntaxWithMap(text: string) {
  let stripped = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const remaining = text.slice(i);
    const markerMatch = remaining.match(/^\((?:style|style-alltext|ruby)=/i);
    if (markerMatch) {
      const closingIndex = text.indexOf(")", i + markerMatch[0].length);
      if (closingIndex !== -1) {
        i = closingIndex;
        continue;
      }
    }
    map[stripped.length] = i;
    stripped += text[i];
  }
  return { text: stripped, map };
}

function mapRangeToRaw(map: number[], rawText: string, start: number, length: number) {
  const rawStart = map[start] ?? rawText.length;
  if (length <= 0) {
    return { rawStart, rawEnd: rawStart };
  }
  const end = start + length;
  const rawEnd = map[end];
  if (rawEnd !== undefined) {
    return { rawStart, rawEnd };
  }
  const rawLast = map[end - 1];
  return { rawStart, rawEnd: rawLast !== undefined ? rawLast + 1 : rawText.length };
}

function normalizeDiceIndex(value: string) {
  return value.replace(/[\uFF10\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18\uFF19]/g, char => (
    String.fromCharCode(char.charCodeAt(0) - 0xFF10 + 0x30)
  ));
}

function formatInlineDicePlain(line: string, diceSize: number) {
  const normalized = normalizeLineBreaks(String(line ?? ""));
  if (!normalized.trim()) {
    return { text: normalized, didReplace: false };
  }
  if (DICE_HIGHLIGHT_PATTERN.test(normalized)) {
    return { text: normalized, didReplace: false };
  }

  let didReplace = false;
  const replaced = normalized.replace(DICE_INLINE_WRAPPER_PATTERN, (match, fullWidthInner, squareInner) => {
    const inner = (fullWidthInner ?? squareInner ?? "").trim();
    const parsed = parseDiceExpressionCore(stripTextEnhanceSyntax(inner));
    if (!parsed) {
      return match;
    }
    const rollResult = resolveRollResult(parsed, diceSize);
    if (rollResult === null) {
      return match;
    }
    didReplace = true;
    const delimiter = parsed.separator ?? "：";
    const wrapperPrefix = fullWidthInner !== undefined ? "【" : "[";
    const wrapperSuffix = fullWidthInner !== undefined ? "】" : "]";
    const detailText = parsed.detail ? parsed.detail : String(rollResult);
    return `${wrapperPrefix}${parsed.expression}${delimiter}${detailText}${wrapperSuffix}`;
  });

  return { text: didReplace ? replaced : normalized, didReplace };
}

function unwrapLine(line: string) {
  const trimmed = line.trim();
  const hasWrapper = (trimmed.startsWith("【") && trimmed.endsWith("】"))
    || (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (hasWrapper && trimmed.length > 1) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

type HeaderDiceMatch = {
  prefix: string;
  suffix: string;
  wrapperPrefix: string;
  wrapperSuffix: string;
  parsed: ParsedDiceExpression;
  delimiterHint?: string;
};

function extractHeaderDiceMatch(line: string): HeaderDiceMatch | null {
  const rawLine = String(line ?? "");
  const { text: plainLine, map } = stripTextEnhanceSyntaxWithMap(rawLine);

  const parseWithTrailingColon = (value: string): { parsed: ParsedDiceExpression | null; delimiterHint?: string } => {
    const parsedDirect = parseDiceExpressionCore(value);
    if (parsedDirect) {
      return { parsed: parsedDirect, delimiterHint: value.includes("：") ? "：" : (value.includes(":") ? ":" : undefined) };
    }
    const stripped = value.replace(/[：:]\s*$/, "");
    const parsedStripped = parseDiceExpressionCore(stripped);
    if (parsedStripped) {
      const delimiterHint = value.includes("：") ? "：" : ":";
      return { parsed: parsedStripped, delimiterHint };
    }
    return { parsed: null };
  };

  let matched: HeaderDiceMatch | null = null;

  const wrapperRegex = new RegExp(DICE_INLINE_WRAPPER_PATTERN.source, "g");
  let wrapperMatch: RegExpExecArray | null = null;
  for (;;) {
    wrapperMatch = wrapperRegex.exec(plainLine);
    if (!wrapperMatch) {
      break;
    }
    const inner = (wrapperMatch[1] ?? wrapperMatch[2] ?? "").trim();
    const parsedResult = parseWithTrailingColon(stripTextEnhanceSyntax(inner));
    if (!parsedResult.parsed) {
      continue;
    }
    const { rawStart, rawEnd } = mapRangeToRaw(map, rawLine, wrapperMatch.index, wrapperMatch[0].length);
    const isFullWidth = wrapperMatch[1] !== undefined;
    matched = {
      prefix: rawLine.slice(0, rawStart),
      suffix: rawLine.slice(rawEnd),
      wrapperPrefix: isFullWidth ? "【" : "[",
      wrapperSuffix: isFullWidth ? "】" : "]",
      parsed: parsedResult.parsed,
      delimiterHint: parsedResult.delimiterHint,
    };
  }

  if (matched) {
    return matched;
  }

  const trimmedPlain = plainLine.trim();
  const fullExprPattern = /^[\dA-Z+\-*/()%.\s]+[:：=].+$/i;
  if (trimmedPlain && fullExprPattern.test(trimmedPlain)) {
    const parsedResult = parseWithTrailingColon(trimmedPlain);
    if (parsedResult.parsed) {
      const startIndex = plainLine.indexOf(trimmedPlain);
      const safeStartIndex = startIndex >= 0 ? startIndex : 0;
      const { rawStart, rawEnd } = mapRangeToRaw(map, rawLine, safeStartIndex, trimmedPlain.length);
      return {
        prefix: rawLine.slice(0, rawStart),
        suffix: rawLine.slice(rawEnd),
        wrapperPrefix: "",
        wrapperSuffix: "",
        parsed: parsedResult.parsed,
        delimiterHint: parsedResult.delimiterHint,
      };
    }
  }

  const forcedRegex = new RegExp(DICE_FORCE_RESULT_SEARCH_PATTERN.source, "gi");
  let forcedMatch: RegExpExecArray | null = null;
  for (;;) {
    forcedMatch = forcedRegex.exec(plainLine);
    if (!forcedMatch) {
      break;
    }
    const candidate = forcedMatch[0];
    const parsedResult = parseWithTrailingColon(stripTextEnhanceSyntax(candidate));
    if (!parsedResult.parsed) {
      continue;
    }
    const { rawStart, rawEnd } = mapRangeToRaw(map, rawLine, forcedMatch.index, candidate.length);
    matched = {
      prefix: rawLine.slice(0, rawStart),
      suffix: rawLine.slice(rawEnd),
      wrapperPrefix: "",
      wrapperSuffix: "",
      parsed: parsedResult.parsed,
      delimiterHint: parsedResult.delimiterHint,
    };
  }

  if (matched) {
    return matched;
  }

  const exprRegex = /\d*\s*d\s*(?:\d|%)[\dA-Z+\-*/()%.\s]*/gi;
  let exprMatch: RegExpExecArray | null = null;
  for (;;) {
    exprMatch = exprRegex.exec(plainLine);
    if (!exprMatch) {
      break;
    }
    const candidate = exprMatch[0];
    const parsedResult = parseWithTrailingColon(stripTextEnhanceSyntax(candidate));
    if (!parsedResult.parsed) {
      continue;
    }
    const { rawStart, rawEnd } = mapRangeToRaw(map, rawLine, exprMatch.index, candidate.length);
    matched = {
      prefix: rawLine.slice(0, rawStart),
      suffix: rawLine.slice(rawEnd),
      wrapperPrefix: "",
      wrapperSuffix: "",
      parsed: parsedResult.parsed,
      delimiterHint: parsedResult.delimiterHint,
    };
  }

  return matched;
}

function parseDiceExpressionCore(core: string): ParsedDiceExpression | null {
  const trimmed = core.trim();
  if (!trimmed || !DICE_EXPRESSION_TOKEN_PATTERN.test(trimmed)) {
    return null;
  }

  const forcedMatch = trimmed.match(DICE_TABLE_FORCED_RESULT_PATTERN);
  if (forcedMatch) {
    const expression = forcedMatch[1]?.trim();
    const resultText = (forcedMatch[2] ?? forcedMatch[3] ?? "").trim();
    const forcedResult = Number.parseInt(resultText, 10);
    if (!expression || !Number.isFinite(forcedResult)) {
      return null;
    }
    const separator = trimmed.match(/[:：=]/)?.[0] ?? "：";
    return { expression, forcedResult, separator };
  }

  const detailMatch = trimmed.match(/^([^:：=]+)([:：=])(.*)$/);
  if (detailMatch) {
    const expression = detailMatch[1]?.trim();
    const detail = detailMatch[3]?.trim() ?? "";
    if (!expression || !detail) {
      return null;
    }
    if (!DICE_EXPRESSION_TOKEN_PATTERN.test(expression)) {
      return null;
    }
    const detailHighlight = parseDetailHighlight(detail);
    if (!detailHighlight) {
      return null;
    }
    const forcedResult = Number.parseInt(detailHighlight.resultText, 10);
    if (!Number.isFinite(forcedResult)) {
      return null;
    }
    return {
      expression,
      forcedResult,
      separator: detailMatch[2] ?? "：",
      detail,
    };
  }

  if (!DICE_EXPRESSION_ONLY_PATTERN.test(trimmed)) {
    return null;
  }

  return { expression: trimmed };
}

function resolveRollResult(parsed: ParsedDiceExpression, diceSize: number): number | null {
  if (Number.isFinite(parsed.forcedResult)) {
    return parsed.forcedResult ?? null;
  }
  try {
    return roll(parsed.expression, diceSize).result;
  }
  catch {
    return null;
  }
}

function buildHighlightToken(value: number | string) {
  return `[${value}](style=color:${DICE_TABLE_HIGHLIGHT_COLOR})`;
}

function extractTrailingNumber(value: string) {
  let end = value.length;
  while (end > 0 && /\s/.test(value[end - 1])) {
    end -= 1;
  }
  let start = end;
  while (start > 0 && /\d/.test(value[start - 1])) {
    start -= 1;
  }
  if (start === end) {
    return null;
  }
  return {
    prefix: value.slice(0, start),
    resultText: value.slice(start, end),
    suffix: "",
  };
}

function parseDetailHighlight(detail: string) {
  const trimmed = detail.trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = stripTextEnhanceSyntax(trimmed);

  const match = cleaned.match(/^\[(\d+)\]$/);
  if (match) {
    return { prefix: "", resultText: match[1], suffix: "" };
  }

  const bracketIndex = cleaned.lastIndexOf("[");
  if (bracketIndex !== -1 && cleaned.endsWith("]")) {
    const resultText = cleaned.slice(bracketIndex + 1, -1).trim();
    if (/^\d+$/.test(resultText)) {
      const prefix = cleaned.slice(0, bracketIndex).trimEnd();
      if (prefix.endsWith("=")) {
        return { prefix, resultText, suffix: "" };
      }
    }
  }

  const trailingNumber = extractTrailingNumber(cleaned);
  if (trailingNumber) {
    return trailingNumber;
  }

  return null;
}

function formatDetailWithHighlight(detail: string, fallbackResult: number | string) {
  const highlight = parseDetailHighlight(detail);
  if (!highlight) {
    return buildHighlightToken(fallbackResult);
  }
  return `${highlight.prefix}${buildHighlightToken(highlight.resultText)}${highlight.suffix}`;
}

function stripDiceResultFromLine(line: string): string {
  const match = extractHeaderDiceMatch(line);
  if (!match || !Number.isFinite(match.parsed.forcedResult)) {
    return line;
  }
  const delimiter = match.parsed.separator ?? match.delimiterHint ?? "";
  const cleanedDetail = match.parsed.detail ? stripTextEnhanceSyntax(match.parsed.detail) : "";
  const hasBracketResult = /\[\d+\]/.test(cleanedDetail);
  let detail = "";
  if (match.parsed.detail && !hasBracketResult) {
    const highlight = parseDetailHighlight(match.parsed.detail);
    if (highlight) {
      detail = `${highlight.prefix}${highlight.suffix}`;
    }
  }
  const detailPart = detail ? `${delimiter}${detail}` : delimiter;
  const cleanedSuffix = match.suffix.replace(/^\((?:style|style-alltext|ruby)=[^)]+\)\s*/i, "");
  return `${match.prefix}${match.wrapperPrefix}${match.parsed.expression}${detailPart}${match.wrapperSuffix}${cleanedSuffix}`;
}

export function stripDiceResultTokens(message: string): string {
  const normalized = normalizeLineBreaks(String(message ?? ""));
  if (!normalized.trim()) {
    return normalized;
  }
  const lines = normalized.split("\n");
  let didReplace = false;
  const outputLines = lines.map((line) => {
    const nextLine = stripDiceResultFromLine(line);
    if (nextLine !== line) {
      didReplace = true;
    }
    return nextLine;
  });
  return didReplace ? outputLines.join("\n") : normalized;
}

function renderDiceHighlight(match: HeaderDiceMatch, rollResult: number) {
  const rollText = String(rollResult);
  const delimiter = match.parsed.separator
    ?? match.delimiterHint
    ?? "：";
  const detailText = match.parsed.detail
    ? formatDetailWithHighlight(match.parsed.detail, rollText)
    : buildHighlightToken(rollText);
  return `${match.prefix}${match.wrapperPrefix}${match.parsed.expression}${delimiter}${detailText}${match.wrapperSuffix}${match.suffix}`;
}

function isOptionLine(line: string) {
  const parsedLine = unwrapLine(stripTextEnhanceSyntax(line));
  return DICE_TABLE_OPTION_PATTERN.test(parsedLine);
}

function getOptionIndex(line: string) {
  const parsedLine = unwrapLine(stripTextEnhanceSyntax(line));
  const match = parsedLine.match(DICE_TABLE_OPTION_PATTERN);
  if (!match) {
    return null;
  }
  return normalizeDiceIndex(match[1]);
}

export function formatAnkoDiceMessage(message: string, diceSize: number): string | null {
  const normalized = normalizeLineBreaks(String(message ?? ""));
  if (!normalized.trim()) {
    return null;
  }
  if (DICE_HIGHLIGHT_PATTERN.test(normalized)) {
    return normalized;
  }

  const lines = normalized.split("\n");
  const lineMatches = lines.map(line => extractHeaderDiceMatch(line));
  const lineResults: Array<number | null | undefined> = Array.from({ length: lines.length }).fill(undefined);
  const getLineResult = (index: number) => {
    if (lineResults[index] !== undefined) {
      return lineResults[index] ?? null;
    }
    const match = lineMatches[index];
    if (!match) {
      lineResults[index] = null;
      return null;
    }
    const result = resolveRollResult(match.parsed, diceSize);
    lineResults[index] = result;
    return result;
  };

  const outputLines = [...lines];
  const usedHeaderLines = new Set<number>();
  const optionLineSet = new Set<number>();

  const optionRuns: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isOptionLine(lines[i])) {
      continue;
    }
    const start = i;
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      if (!isOptionLine(lines[j])) {
        break;
      }
      end = j;
      i = j;
    }
    optionRuns.push({ start, end });
  }

  for (const run of optionRuns) {
    for (let i = run.start; i <= run.end; i++) {
      optionLineSet.add(i);
    }

    let headerIndex = -1;
    for (let i = run.start - 1; i >= 0; i--) {
      if (usedHeaderLines.has(i)) {
        continue;
      }
      const match = lineMatches[i];
      const result = getLineResult(i);
      if (match && result !== null) {
        headerIndex = i;
        break;
      }
    }

    const headerResult = headerIndex >= 0 ? getLineResult(headerIndex) : null;
    const rollText = headerResult !== null ? String(headerResult) : null;
    if (headerIndex >= 0 && lineMatches[headerIndex] && headerResult !== null) {
      usedHeaderLines.add(headerIndex);
      outputLines[headerIndex] = renderDiceHighlight(lineMatches[headerIndex]!, headerResult);
    }

    for (let i = run.start; i <= run.end; i++) {
      const formattedLine = formatInlineDicePlain(outputLines[i], diceSize).text;
      const optionIndex = getOptionIndex(formattedLine);
      if (rollText && optionIndex === rollText) {
        outputLines[i] = buildHighlightToken(formattedLine.trim());
      }
      else {
        outputLines[i] = formattedLine;
      }
    }
  }

  let didReplace = false;
  for (let i = 0; i < outputLines.length; i++) {
    if (optionLineSet.has(i)) {
      if (outputLines[i] !== lines[i]) {
        didReplace = true;
      }
      continue;
    }
    if (usedHeaderLines.has(i)) {
      didReplace = true;
      continue;
    }
    const match = lineMatches[i];
    const result = getLineResult(i);
    if (match && result !== null) {
      const nextLine = renderDiceHighlight(match, result);
      if (nextLine !== outputLines[i]) {
        outputLines[i] = nextLine;
        didReplace = true;
      }
    }
    else if (outputLines[i] !== lines[i]) {
      didReplace = true;
    }
  }

  return didReplace ? outputLines.join("\n") : null;
}
