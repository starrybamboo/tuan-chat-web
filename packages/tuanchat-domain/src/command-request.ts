export type CommandInfo = {
  name: string;
  alias: string[];
  description: string;
  examples: string[];
  usage: string;
};

export function isCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!(trimmed.startsWith(".") || trimmed.startsWith("。") || trimmed.startsWith("/"))) {
    return false;
  }
  const secondChar = trimmed.charAt(1);
  if (secondChar === "." || secondChar === "。" || secondChar === "/" || secondChar === "%") {
    return false;
  }
  return /^[.。/][A-Z].*/i.test(trimmed);
}

export function containsCommandRequestAllToken(text: string): boolean {
  const raw = String(text ?? "");
  return /@all\b/i.test(raw)
    || raw.includes("@全员")
    || raw.includes("@所有人")
    || raw.includes("@检定请求");
}

export function stripCommandRequestAllToken(text: string): string {
  return String(text ?? "")
    .replace(/@all\b/gi, " ")
    .replace(/@全员/g, " ")
    .replace(/@所有人/g, " ")
    .replace(/@检定请求/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstCommandText(text: string): string | null {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return null;
  }
  if (isCommand(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/[.。/][A-Z][^\n]*/i);
  if (!match) {
    return null;
  }
  const candidate = match[0].trim();
  return isCommand(candidate) ? candidate : null;
}
