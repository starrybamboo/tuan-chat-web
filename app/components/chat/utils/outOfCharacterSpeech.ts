export function isOutOfCharacterSpeech(content?: string | null): boolean {
  if (typeof content !== "string" || content.length === 0) {
    return false;
  }

  return content.startsWith("(") || content.startsWith("（");
}

export function buildOutOfCharacterSpeechContent(content?: string | null): string | null {
  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) {
    return null;
  }

  return `（${trimmed}）`;
}
