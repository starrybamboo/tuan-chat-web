import { roll } from "@/components/common/dicer/dice";

const DICE_TABLE_HIGHLIGHT_COLOR = "#FF6B00";
const DICE_TABLE_OPTION_PATTERN = /^\s*(\d+)\s+(\S.*)$/;
const DICE_TABLE_FORCED_RESULT_PATTERN = /^([^:：=]+)[:：=]\s*(?:\[(\d+)\]|(\d+))$/;
const DICE_EXPRESSION_ONLY_PATTERN = /^[\dA-Z+\-*/()%.\s]+$/i;
const DICE_EXPRESSION_TOKEN_PATTERN = /\d*\s*d\s*(?:\d+|%)/i;
const DICE_FORCE_RESULT_SEARCH_PATTERN = /\d*\s*d\s*(?:\d+|%)\s*[:：=]\s*(?:\[\d+\]|\d+)/i;
const DICE_INLINE_WRAPPER_PATTERN = /【([^】\n\r]+)】|\[([^\]\n\r]+)\]/g;
const TEXT_ENHANCE_MARKER_PATTERN = /\((?:style|style-alltext|ruby)=/i;

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
  const plainLine = stripTextEnhanceSyntax(rawLine);

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
    const isFullWidth = wrapperMatch[1] !== undefined;
    matched = {
      prefix: rawLine.slice(0, wrapperMatch.index),
      suffix: rawLine.slice(wrapperMatch.index + wrapperMatch[0].length),
      wrapperPrefix: isFullWidth ? "【" : "[",
      wrapperSuffix: isFullWidth ? "】" : "]",
      parsed: parsedResult.parsed,
      delimiterHint: parsedResult.delimiterHint,
    };
  }

  if (matched) {
    return matched;
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
    matched = {
      prefix: rawLine.slice(0, forcedMatch.index),
      suffix: rawLine.slice(forcedMatch.index + candidate.length),
      wrapperPrefix: "",
      wrapperSuffix: "",
      parsed: parsedResult.parsed,
      delimiterHint: parsedResult.delimiterHint,
    };
  }

  if (matched) {
    return matched;
  }

  const exprRegex = /\d*\s*d\s*(?:\d+|%)[\dA-Z+\-*/()%.\s]*/gi;
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
    matched = {
      prefix: rawLine.slice(0, exprMatch.index),
      suffix: rawLine.slice(exprMatch.index + candidate.length),
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

  const detailMatch = trimmed.match(/^([^:：=]+)([:：=])\s*(.+)$/);
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

function parseDetailHighlight(detail: string) {
  const trimmed = detail.trim();
  if (!trimmed) {
    return null;
  }

  let match = trimmed.match(/^\[(\d+)\]$/);
  if (match) {
    return { prefix: "", resultText: match[1], suffix: "" };
  }

  match = trimmed.match(/^(.*?=)\s*(\d+)\s*$/);
  if (match) {
    return { prefix: match[1], resultText: match[2], suffix: "" };
  }

  match = trimmed.match(/^(.*?)(\d+)\s*$/);
  if (match) {
    return { prefix: match[1], resultText: match[2], suffix: "" };
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

// Parse simple dice table text and return highlighted result.
export function formatDiceTableMessage(message: string, diceSize: number): string | null {
  const normalized = normalizeLineBreaks(String(message ?? ""));
  const hasEnhancedSyntax = TEXT_ENHANCE_MARKER_PATTERN.test(normalized);
  const lines = normalized.split("\n");
  if (lines.length < 2) {
    return null;
  }

  const headerLine = lines[0] ?? "";
  if (!headerLine.trim()) {
    return null;
  }

  const headerMatch = extractHeaderDiceMatch(headerLine);
  if (!headerMatch) {
    return null;
  }

  const rollResult = resolveRollResult(headerMatch.parsed, diceSize);
  if (rollResult === null) {
    return null;
  }

  const optionLines = lines.slice(1);
  const hasOptions = optionLines.some((line) => {
    const parsedLine = unwrapLine(stripTextEnhanceSyntax(line));
    return DICE_TABLE_OPTION_PATTERN.test(parsedLine);
  });
  if (!hasOptions) {
    return null;
  }

  const rollText = String(rollResult);
  const hasMatch = optionLines.some((line) => {
    const parsedLine = unwrapLine(stripTextEnhanceSyntax(line));
    const match = parsedLine.match(DICE_TABLE_OPTION_PATTERN);
    return match && match[1] === rollText;
  });
  if (!hasMatch) {
    return null;
  }

  if (hasEnhancedSyntax) {
    return normalized;
  }

  const colonChar = headerMatch.parsed.separator
    ?? headerMatch.delimiterHint
    ?? "：";
  const detailText = headerMatch.parsed.detail
    ? formatDetailWithHighlight(headerMatch.parsed.detail, rollText)
    : buildHighlightToken(rollText);
  const formattedLines = [
    `${headerMatch.prefix}${headerMatch.wrapperPrefix}${headerMatch.parsed.expression}${colonChar}${detailText}${headerMatch.wrapperSuffix}${headerMatch.suffix}`,
  ];

  for (const line of optionLines) {
    const parsedLine = unwrapLine(stripTextEnhanceSyntax(line));
    const match = parsedLine.match(DICE_TABLE_OPTION_PATTERN);
    if (match && match[1] === rollText) {
      formattedLines.push(buildHighlightToken(line.trim()));
    }
    else {
      formattedLines.push(line);
    }
  }

  return formattedLines.join("\n");
}

export function formatInlineDiceMessage(message: string, diceSize: number): string | null {
  const normalized = normalizeLineBreaks(String(message ?? ""));
  if (!normalized.trim()) {
    return null;
  }

  const hasEnhancedSyntax = TEXT_ENHANCE_MARKER_PATTERN.test(normalized);
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
    if (hasEnhancedSyntax) {
      return match;
    }
    const delimiter = parsed.separator ?? "：";
    const detailText = parsed.detail
      ? formatDetailWithHighlight(parsed.detail, String(rollResult))
      : buildHighlightToken(String(rollResult));
    const wrapperPrefix = fullWidthInner !== undefined ? "【" : "[";
    const wrapperSuffix = fullWidthInner !== undefined ? "】" : "]";
    return `${wrapperPrefix}${parsed.expression}${delimiter}${detailText}${wrapperSuffix}`;
  });

  if (didReplace) {
    return hasEnhancedSyntax ? normalized : replaced;
  }

  const detectionText = stripTextEnhanceSyntax(normalized);
  const trimmedDetection = detectionText.trim();
  const parsed = parseDiceExpressionCore(trimmedDetection);
  if (!parsed) {
    if (hasEnhancedSyntax && DICE_FORCE_RESULT_SEARCH_PATTERN.test(detectionText)) {
      return normalized;
    }
    return null;
  }

  const rollResult = resolveRollResult(parsed, diceSize);
  if (rollResult === null) {
    return null;
  }
  if (hasEnhancedSyntax) {
    return normalized;
  }

  const leading = normalized.match(/^\s*/)?.[0] ?? "";
  const trailing = normalized.match(/\s*$/)?.[0] ?? "";
  const delimiter = parsed.separator ?? "：";
  const detailText = parsed.detail
    ? formatDetailWithHighlight(parsed.detail, String(rollResult))
    : buildHighlightToken(String(rollResult));
  return `${leading}${parsed.expression}${delimiter}${detailText}${trailing}`;
}

export function formatAnkoDiceMessage(message: string, diceSize: number): string | null {
  return formatDiceTableMessage(message, diceSize) ?? formatInlineDiceMessage(message, diceSize);
}
