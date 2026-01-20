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

export function parseImportedChatText(text: string): ImportChatTextParseResult {
  const normalized = normalizeLineBreaks(String(text ?? ""));
  const lines = normalized.split("\n");

  const messages: ImportedChatLine[] = [];
  const invalidLines: Array<{ lineNumber: number; raw: string }> = [];

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? "";
    const trimmed = raw.trim();
    const lineNumber = index + 1;

    if (!trimmed) {
      continue;
    }
    if (!trimmed.startsWith("[")) {
      invalidLines.push({ lineNumber, raw });
      continue;
    }

    const closeIndex = trimmed.indexOf("]");
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
