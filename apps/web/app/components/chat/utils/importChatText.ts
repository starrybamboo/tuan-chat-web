import { stripUnsupportedImportedMediaPlaceholders } from "./cqMediaImport";

type ImportedChatLine = {
  lineNumber: number;
  raw: string;
  speakerName: string;
  content: string;
  diceTurn?: ImportedDiceTurn;
};

export type ImportedDiceTurn = {
  dicerSpeakerName: string;
  replyContent: string;
  replyContents?: string[];
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

function normalizeImportedContent(content: string) {
  const withoutEchoVoiceMarker = content.trim().replace(/\s*\{\*\}\s*$/, "");
  return stripUnsupportedImportedMediaPlaceholders(withoutEchoVoiceMarker);
}

function stripForumCodeMarkup(text: string) {
  return text
    .replace(/\[\/?(?:color|size|font|[biu])(?:=[^\]]*)?\]/gi, "")
    .replace(/\[br\s*\/?\]/gi, "\n");
}

function stripEchoDicePrefix(text: string) {
  return text.replace(/^\s*#\s+/, "");
}

function normalizeLineForInlineParsing(rawLine: string) {
  return stripEchoDicePrefix(stripForumCodeMarkup(rawLine)).trim();
}

function normalizeImportedSpeakerName(speakerName: string) {
  return speakerName
    .trim()
    .replace(/\s*,\s*KP$/i, "")
    .replace(/\s*[（(]\d+[）)]\s*$/, "")
    .trim();
}

function stripInlineTimePrefix(text: string) {
  const timePrefix = String.raw`(?:\d{2,4}[./-]\d{1,2}[./-]\d{1,2}\s+)?\d{1,2}:\d{2}(?::\d{2})?`;
  return text.replace(new RegExp(String.raw`^\s*${timePrefix}\s+`), "").trim();
}

function parseTaggedChatText(lines: string[]): ImportChatTextParseResult {
  const messages: ImportedChatLine[] = [];
  const invalidLines: Array<{ lineNumber: number; raw: string }> = [];

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? "";
    const trimmed = normalizeLineForInlineParsing(raw);
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

    const speakerName = normalizeImportedSpeakerName(trimmed.slice(1, closeIndex));
    let rest = trimmed.slice(closeIndex + 1);
    rest = rest.replace(/^\s+/, "");

    const colon = rest[0];
    if (colon !== ":" && colon !== "：") {
      invalidLines.push({ lineNumber, raw });
      continue;
    }

    let content = rest.slice(1);
    content = normalizeImportedContent(content.replace(/^\s+/, ""));

    if (!speakerName || !content) {
      if (!speakerName || !rest.includes("[mirai:image:")) {
        invalidLines.push({ lineNumber, raw });
      }
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

function matchInlineAngleMessage(rawLine: string): { speakerName: string; content: string } | null {
  const withoutMarkup = normalizeLineForInlineParsing(rawLine);
  const trimmed = stripInlineTimePrefix(withoutMarkup);
  if (!trimmed.startsWith("<")) {
    return null;
  }
  const closeIndex = trimmed.indexOf(">");
  if (closeIndex <= 1) {
    return null;
  }
  let rest = trimmed.slice(closeIndex + 1).trimStart();
  if (rest[0] === ":" || rest[0] === "：") {
    rest = rest.slice(1).trimStart();
  }

  const speakerName = normalizeImportedSpeakerName(trimmed.slice(1, closeIndex));
  const content = normalizeImportedContent(rest);
  if (!speakerName || !content) {
    return null;
  }
  return { speakerName, content };
}

function parseInlineAngleChatText(lines: string[]): ImportChatTextParseResult {
  const messages: ImportedChatLine[] = [];
  const invalidLines: Array<{ lineNumber: number; raw: string }> = [];
  let currentMessage:
    | {
      lineNumber: number;
      rawLine: string;
      speakerName: string;
      contentLines: string[];
    }
    | null = null;

  const flushCurrentMessage = () => {
    if (!currentMessage) {
      return;
    }
    const rawContent = currentMessage.contentLines.join("\n").trim();
    const content = normalizeImportedContent(rawContent);
    if (!content) {
      if (!rawContent.includes("[mirai:image:")) {
        invalidLines.push({ lineNumber: currentMessage.lineNumber, raw: currentMessage.rawLine });
      }
      currentMessage = null;
      return;
    }
    messages.push({
      lineNumber: currentMessage.lineNumber,
      raw: currentMessage.rawLine,
      speakerName: currentMessage.speakerName,
      content,
    });
    currentMessage = null;
  };

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? "";
    const trimmed = normalizeLineForInlineParsing(raw);
    const lineNumber = index + 1;

    if (!trimmed) {
      if (currentMessage) {
        currentMessage.contentLines.push("");
      }
      continue;
    }

    const message = matchInlineAngleMessage(raw);
    if (message) {
      flushCurrentMessage();
      currentMessage = {
        lineNumber,
        rawLine: raw,
        speakerName: message.speakerName,
        contentLines: [message.content],
      };
      continue;
    }

    if (currentMessage) {
      currentMessage.contentLines.push(normalizeImportedContent(stripForumCodeMarkup(raw)));
      continue;
    }

    invalidLines.push({ lineNumber, raw });
  }
  flushCurrentMessage();

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
    const rawContent = currentMessage.contentLines.join("\n").trim();
    const content = normalizeImportedContent(rawContent);
    if (!content) {
      if (!rawContent.includes("[mirai:image:")) {
        invalidLines.push({ lineNumber: currentMessage.lineNumber, raw: currentMessage.rawHeaderLine });
      }
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

function isLikelyDicerCommand(content: string) {
  const normalized = content.trim();
  return (normalized.startsWith(".") || normalized.startsWith(",")) && normalized.length > 1;
}

function getDicerCommandName(content: string) {
  const matched = content.trim().match(/^[.,]\s*([a-z][a-z0-9]*)\b/i);
  return matched?.[1]?.toLowerCase() ?? null;
}

function shouldIgnoreImportedControlCommand(message: ImportedChatLine) {
  return getDicerCommandName(message.content) === "log";
}

function extractDiceReplyActor(content: string): string | null {
  const normalized = content.trim();
  const matched = normalized.match(/<([^<>]+)>[^，。,.]*(?:掷出了|检定结果为)/);
  const actor = matched?.[1]?.trim();
  return actor || null;
}

function mergeImportedDiceTurns(messages: ImportedChatLine[]): ImportedChatLine[] {
  const merged: ImportedChatLine[] = [];
  for (const message of messages) {
    const previous = merged[merged.length - 1];
    const isDicerReply = isDicerSpeakerName(message.speakerName);
    const diceReplyActor = isDicerReply ? extractDiceReplyActor(message.content) : null;
    const sameDicerAsPreviousReply = Boolean(
      previous?.diceTurn
      && isDicerReply
      && normalizeSpeakerName(previous.diceTurn.dicerSpeakerName) === normalizeSpeakerName(message.speakerName),
    );
    const shouldAppendToPreviousReply = sameDicerAsPreviousReply && Boolean(previous);
    const shouldStartDiceTurn = Boolean(
      previous
      && isDicerReply
      && isLikelyDicerCommand(previous.content)
      && (!diceReplyActor || normalizeSpeakerName(previous.speakerName) === normalizeSpeakerName(diceReplyActor)),
    );

    if (shouldAppendToPreviousReply && previous?.diceTurn) {
      merged[merged.length - 1] = {
        ...previous,
        diceTurn: {
          ...previous.diceTurn,
          replyContent: `${previous.diceTurn.replyContent}\n${message.content}`,
        },
      };
      continue;
    }

    if (!shouldStartDiceTurn || !previous) {
      merged.push(message);
      continue;
    }

    merged[merged.length - 1] = {
      ...previous,
      diceTurn: {
        dicerSpeakerName: message.speakerName,
        replyContent: message.content,
      },
    };
  }
  return merged;
}

export function parseImportedChatText(text: string): ImportChatTextParseResult {
  const normalized = normalizeLineBreaks(String(text ?? ""));
  const lines = normalized.split("\n");

  const taggedResult = parseTaggedChatText(lines);
  const qqResult = parseQqChatText(lines);
  const inlineAngleResult = parseInlineAngleChatText(lines);
  const chosen = [taggedResult, qqResult, inlineAngleResult].reduce(chooseBetterParseResult);
  const messages = chosen.messages.filter(message => !shouldIgnoreImportedControlCommand(message));
  return {
    ...chosen,
    messages: mergeImportedDiceTurns(messages),
  };
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
    || normalized.startsWith("海豹")
    || normalized === "dice"
    || normalized === "dicer"
    || normalized === "dicebot";
}
