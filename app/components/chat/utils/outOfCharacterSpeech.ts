const OPENING_BRACKETS = new Set(["(", "（"]);
const CLOSING_BRACKETS = new Set([")", "）"]);

export function isOutOfCharacterSpeech(content?: string | null): boolean {
  if (typeof content !== "string" || content.length === 0) {
    return false;
  }

  const trimmedEnd = content.trimEnd();
  if (trimmedEnd.length === 0) {
    return false;
  }

  return OPENING_BRACKETS.has(content[0]) && CLOSING_BRACKETS.has(trimmedEnd[trimmedEnd.length - 1]);
}

export function buildOutOfCharacterSpeechContent(content?: string | null): string | null {
  if (typeof content !== "string" || content.length === 0) {
    return null;
  }

  const trimmed = content.trim();
  const normalizedContent = trimmed.length > 0 ? trimmed : content;
  return `（${normalizedContent}）`;
}
