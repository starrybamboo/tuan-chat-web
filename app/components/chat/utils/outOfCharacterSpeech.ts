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
  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) {
    return null;
  }

  return `（${trimmed}）`;
}
