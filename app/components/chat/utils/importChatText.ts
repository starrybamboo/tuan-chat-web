export type ImportedChatLine = {
  lineNumber: number;
  raw: string;
  speakerName: string;
  content: string;
};

export const IMPORT_SPECIAL_ROLE_ID = {
  NARRATOR: -1,
  DICER: -2,
} as const;

export type ImportChatTextParseResult = {
  messages: ImportedChatLine[];
  invalidLines: Array<{ lineNumber: number; raw: string }>;
};

function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function parseTaggedChatText(lines: string[]): ImportChatTextParseResult {
  const messages: ImportedChatLine[] = [];
  const invalidLines: Array<{ lineNumber: number; raw: string }> = [];

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? "";
    const trimmed = raw.trim();
    const lineNumber = index + 1;

    if (!trimmed) {
      continue;
    }
    const openingTag = trimmed[0];
    const closingTag = openingTag === "[" ? "]" : openingTag === "<" ? ">" : "";
    if (!closingTag) {
      invalidLines.push({ lineNumber, raw });
      continue;
    }

    const closeIndex = trimmed.indexOf(closingTag);
    if (closeIndex <= 1) {
      invalidLines.push({ lineNumber, raw });
      continue;
    }

    const speakerName = trimmed.slice(1, closeIndex).trim();
    let rest = trimmed.slice(closeIndex + 1);
    rest = rest.replace(/^\s+/, "");

    const colon = rest[0];
    if (colon !== ":" && colon !== "：") {
      invalidLines.push({ lineNumber, raw });
      continue;
    }

    let content = rest.slice(1);
    content = content.replace(/^\s+/, "").trim();

    if (!speakerName || !content) {
      invalidLines.push({ lineNumber, raw });
      continue;
    }

    messages.push({
      lineNumber,
      raw,
      speakerName,
      content,
    });
  }

  return { messages, invalidLines };
}

const QQ_HEADER_REGEX = /^(.+?)[(（][^()（）]+[)）]\s+\d{2,4}[./-]\d{1,2}[./-]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?$/;

function matchQqHeaderLine(rawLine: string): { speakerName: string } | null {
  const trimmed = rawLine.trim();
  if (!trimmed) {
    return null;
  }
  const matched = trimmed.match(QQ_HEADER_REGEX);
  if (!matched) {
    return null;
  }
  const speakerName = (matched[1] ?? "").trim();
  if (!speakerName) {
    return null;
  }
  return { speakerName };
}

function parseQqChatText(lines: string[]): ImportChatTextParseResult {
  const messages: ImportedChatLine[] = [];
  const invalidLines: Array<{ lineNumber: number; raw: string }> = [];
  let currentMessage:
    | {
      lineNumber: number;
      rawHeaderLine: string;
      speakerName: string;
      contentLines: string[];
    }
    | null = null;

  const flushCurrentMessage = () => {
    if (!currentMessage) {
      return;
    }
    const content = currentMessage.contentLines.join("\n").trim();
    if (!content) {
      invalidLines.push({ lineNumber: currentMessage.lineNumber, raw: currentMessage.rawHeaderLine });
      currentMessage = null;
      return;
    }
    messages.push({
      lineNumber: currentMessage.lineNumber,
      raw: currentMessage.rawHeaderLine,
      speakerName: currentMessage.speakerName,
      content,
    });
    currentMessage = null;
  };

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? "";
    const trimmed = raw.trim();
    const lineNumber = index + 1;

    if (!trimmed) {
      if (currentMessage) {
        currentMessage.contentLines.push(raw);
      }
      continue;
    }

    const header = matchQqHeaderLine(raw);
    if (header) {
      flushCurrentMessage();
      currentMessage = {
        lineNumber,
        rawHeaderLine: raw,
        speakerName: header.speakerName,
        contentLines: [],
      };
      continue;
    }

    if (currentMessage) {
      currentMessage.contentLines.push(raw);
      continue;
    }

    invalidLines.push({ lineNumber, raw });
  }
  flushCurrentMessage();

  return { messages, invalidLines };
}

function chooseBetterParseResult(
  first: ImportChatTextParseResult,
  second: ImportChatTextParseResult,
): ImportChatTextParseResult {
  // 自动识别导入格式：优先保留可解析消息更多的结果；并列时选择无效行更少的结果。
  if (second.messages.length > first.messages.length) {
    return second;
  }
  if (second.messages.length < first.messages.length) {
    return first;
  }
  if (second.invalidLines.length < first.invalidLines.length) {
    return second;
  }
  return first;
}

export function parseImportedChatText(text: string): ImportChatTextParseResult {
  const normalized = normalizeLineBreaks(String(text ?? ""));
  const lines = normalized.split("\n");

  const taggedResult = parseTaggedChatText(lines);
  const qqResult = parseQqChatText(lines);
  return chooseBetterParseResult(taggedResult, qqResult);
}

export function normalizeSpeakerName(name: string) {
  return String(name ?? "").trim().replace(/\s+/g, " ");
}

export function isDicerSpeakerName(name: string) {
  const normalized = normalizeSpeakerName(name).toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized === "骰娘"
    || normalized === "dice"
    || normalized === "dicer"
    || normalized === "dicebot";
}
