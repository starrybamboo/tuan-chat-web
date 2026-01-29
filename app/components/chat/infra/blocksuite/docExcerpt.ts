export function extractDocExcerptFromStore(
  store: any,
  opts?: {
    maxChars?: number;
    maxParagraphs?: number;
  },
): string {
  const maxChars = typeof opts?.maxChars === "number" && Number.isFinite(opts.maxChars) && opts.maxChars > 0 ? opts.maxChars : 220;
  const maxParagraphs = typeof opts?.maxParagraphs === "number" && Number.isFinite(opts.maxParagraphs) && opts.maxParagraphs > 0 ? opts.maxParagraphs : 9999;

  try {
    const models = (store as any)?.getModelsByFlavour?.("affine:paragraph") as any[] | undefined;
    const parts: string[] = [];

    for (const m of models ?? []) {
      if (parts.length >= maxParagraphs)
        break;

      const t = m?.props?.text;
      const s = typeof t?.toString === "function" ? t.toString() : String(t ?? "");
      const trimmed = String(s ?? "").replace(/\s+/g, " ").trim();
      if (!trimmed)
        continue;

      parts.push(trimmed);

      if (parts.join(" ").length >= maxChars)
        break;
    }

    const joined = parts.join(" ").trim();
    if (!joined)
      return "";
    return joined.length > maxChars ? `${joined.slice(0, maxChars)}…` : joined;
  }
  catch {
    return "";
  }
}

