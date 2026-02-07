import { roll } from "@/components/common/dicer/dice";

const DICE_TABLE_HIGHLIGHT_COLOR = "#FF6B00";
const DICE_TABLE_OPTION_PATTERN = /^\s*(\d+)\s+(\S.*)$/;
const DICE_TABLE_FORCED_RESULT_PATTERN = /^([^:：=]+)[:：=]\s*(?:\[(\d+)\]|(\d+))$/;
const TEXT_ENHANCE_MARKER_PATTERN = /\((?:style|style-alltext|ruby)=/i;

function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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
  const headerTrimmed = headerLine.trim();
  if (!headerTrimmed) {
    return null;
  }

  let headerWrapperPrefix = "";
  let headerWrapperSuffix = "";
  let headerCore = headerTrimmed;
  const hasWrapperPrefix = headerTrimmed.startsWith("【") || headerTrimmed.startsWith("[");
  const hasWrapperSuffix = headerTrimmed.endsWith("】") || headerTrimmed.endsWith("]");
  if (hasWrapperPrefix && hasWrapperSuffix && headerTrimmed.length > 1) {
    headerWrapperPrefix = headerTrimmed[0] ?? "";
    headerWrapperSuffix = headerTrimmed[headerTrimmed.length - 1] ?? "";
    headerCore = headerTrimmed.slice(1, -1).trim();
  }

  const forcedMatch = headerCore.match(DICE_TABLE_FORCED_RESULT_PATTERN);
  const headerExpression = (forcedMatch ? forcedMatch[1] : headerCore.replace(/[：:]\s*$/, "")).trim();
  if (!headerExpression || !/d/i.test(headerExpression)) {
    return null;
  }

  let rollResult: number;
  const forcedValue = forcedMatch ? Number.parseInt((forcedMatch[2] ?? forcedMatch[3] ?? "").trim(), 10) : Number.NaN;
  if (Number.isFinite(forcedValue)) {
    rollResult = forcedValue;
  }
  else {
    try {
      rollResult = roll(headerExpression, diceSize).result;
    }
    catch {
      return null;
    }
  }

  const optionLines = lines.slice(1);
  const hasOptions = optionLines.some(line => DICE_TABLE_OPTION_PATTERN.test(line));
  if (!hasOptions) {
    return null;
  }

  const rollText = String(rollResult);
  const hasMatch = optionLines.some((line) => {
    const match = line.match(DICE_TABLE_OPTION_PATTERN);
    return match && match[1] === rollText;
  });
  if (!hasMatch) {
    return null;
  }

  if (hasEnhancedSyntax) {
    return normalized;
  }

  const colonChar = headerCore.endsWith(":") ? ":" : (headerCore.endsWith("：") ? "：" : "：");
  const highlightToken = `[${rollText}](style=color:${DICE_TABLE_HIGHLIGHT_COLOR})`;
  const formattedLines = [`${headerWrapperPrefix}${headerExpression}${colonChar}${highlightToken}${headerWrapperSuffix}`];

  for (const line of optionLines) {
    const match = line.match(DICE_TABLE_OPTION_PATTERN);
    if (match && match[1] === rollText) {
      formattedLines.push(`[${line.trim()}](style=color:${DICE_TABLE_HIGHLIGHT_COLOR})`);
    }
    else {
      formattedLines.push(line);
    }
  }

  return formattedLines.join("\n");
}
