export type WebgalChooseOption = {
  text: string;
  code?: string;
};

export type WebgalChoosePayload = {
  options: WebgalChooseOption[];
};

const MAX_SUMMARY_ITEMS = 3;

function normalizeCode(value: unknown): string {
  if (typeof value !== "string")
    return "";
  return value.trim();
}

function normalizeOption(raw: unknown): WebgalChooseOption | null {
  if (!raw || typeof raw !== "object")
    return null;

  const text = String((raw as any).text ?? "").trim();
  if (!text)
    return null;

  const code = normalizeCode((raw as any).code);

  return {
    text,
    ...(code ? { code } : {}),
  };
}

function sanitizeChooseText(text: string): string {
  return text
    .replace(/\r?\n+/g, " ")
    .replace(/\|/g, "｜")
    .replace(/:/g, "：")
    .replace(/;/g, "；")
    .trim();
}

function normalizeCodeLines(code: string): string[] {
  return code
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

export function extractWebgalChoosePayload(extra: unknown): WebgalChoosePayload | null {
  const payload = (extra as any)?.webgalChoose;
  if (!payload || typeof payload !== "object")
    return null;

  const rawOptions = (payload as any).options;
  if (!Array.isArray(rawOptions))
    return null;

  const options = rawOptions
    .map(normalizeOption)
    .filter((item): item is WebgalChooseOption => Boolean(item));

  if (options.length === 0)
    return null;

  return { options };
}

export function buildWebgalChooseScriptLines(payload: WebgalChoosePayload, messageId: number | string): string[] {
  const safeId = String(messageId ?? "0").replace(/[^a-zA-Z0-9_-]/g, "_");
  const baseLabel = `__choose_${safeId}`;
  const endLabel = `${baseLabel}_end`;

  const optionLabels = payload.options.map((_, index) => `${baseLabel}_${index + 1}`);
  const chooseLine = `choose:${payload.options.map((option, index) => {
    const text = sanitizeChooseText(option.text);
    return `${text}:${optionLabels[index]}`;
  }).join("|")};`;

  const lines: string[] = [chooseLine];

  payload.options.forEach((option, index) => {
    lines.push(`label:${optionLabels[index]};`);
    const codeLines = normalizeCodeLines(option.code ?? "");
    if (codeLines.length) {
      lines.push(...codeLines);
    }
    lines.push(`jumpLabel:${endLabel};`);
  });

  lines.push(`label:${endLabel};`);
  return lines;
}

export function formatWebgalChooseSummary(payload: WebgalChoosePayload): string {
  const labels = payload.options
    .map(option => option.text.trim())
    .filter(Boolean);

  if (labels.length === 0)
    return "";

  const summary = labels.slice(0, MAX_SUMMARY_ITEMS).join(" / ");
  const hasCode = payload.options.some(option => Boolean(option.code?.trim()));
  const suffix = hasCode ? "（含代码）" : "";
  return labels.length > MAX_SUMMARY_ITEMS
    ? `${summary} ...${suffix}`
    : `${summary}${suffix}`;
}
