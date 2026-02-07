export type WebgalChooseOption = {
  text: string;
  target: string;
  showCondition?: string;
  enableCondition?: string;
};

export type WebgalChoosePayload = {
  options: WebgalChooseOption[];
};

const MAX_SUMMARY_ITEMS = 3;

function normalizeCondition(value: unknown): string | undefined {
  if (typeof value !== "string")
    return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeOption(raw: unknown): WebgalChooseOption | null {
  if (!raw || typeof raw !== "object")
    return null;

  const text = String((raw as any).text ?? "").trim();
  const target = String((raw as any).target ?? "").trim();
  if (!text || !target)
    return null;

  const showCondition = normalizeCondition((raw as any).showCondition);
  const enableCondition = normalizeCondition((raw as any).enableCondition);

  return {
    text,
    target,
    ...(showCondition ? { showCondition } : {}),
    ...(enableCondition ? { enableCondition } : {}),
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

function sanitizeChooseTarget(target: string): string {
  return target.replace(/;+\s*$/, "").trim();
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

export function buildWebgalChooseLine(payload: WebgalChoosePayload): string {
  const parts = payload.options.map((option) => {
    const showCondition = normalizeCondition(option.showCondition);
    const enableCondition = normalizeCondition(option.enableCondition);
    const conditionPart = showCondition ? `(${showCondition})` : "";
    const enablePart = enableCondition ? `[${enableCondition}]` : "";
    const prefix = conditionPart || enablePart ? `${conditionPart}${enablePart}->` : "";
    const text = sanitizeChooseText(option.text);
    const target = sanitizeChooseTarget(option.target);
    return `${prefix}${text}:${target}`;
  });

  return `choose:${parts.join("|")};`;
}

export function formatWebgalChooseSummary(payload: WebgalChoosePayload): string {
  const labels = payload.options
    .map(option => option.text.trim())
    .filter(Boolean);

  if (labels.length === 0)
    return "";

  const summary = labels.slice(0, MAX_SUMMARY_ITEMS).join(" / ");
  return labels.length > MAX_SUMMARY_ITEMS
    ? `${summary} ...`
    : summary;
}
