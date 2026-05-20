export function stripDicerTags(text: string): string {
  return text.replace(/#[^#]+#/g, "").trim();
}

export function selectWeightedCopywritingSuffix(
  copywritingKey: string | null,
  copywritingMap: Record<string, string[]>,
  randomValue = Math.random(),
): string {
  const normalizedKey = copywritingKey?.trim();
  if (!normalizedKey) {
    return "";
  }
  const texts = copywritingMap[normalizedKey];
  if (!Array.isArray(texts) || texts.length === 0) {
    return "";
  }

  const weightedTexts: string[] = [];
  for (const text of texts) {
    const weightMatch = text.match(/^::(\d+)::/);
    if (weightMatch) {
      const weight = Number.parseInt(weightMatch[1]);
      const actualText = text.slice(weightMatch[0].length);
      for (let i = 0; i < weight; i += 1) {
        weightedTexts.push(actualText);
      }
    }
    else {
      weightedTexts.push(text);
    }
  }
  if (weightedTexts.length === 0) {
    return "";
  }

  const normalizedRandom = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 0.999999999)
    : 0;
  const randomIdx = Math.floor(normalizedRandom * weightedTexts.length);
  return `\n${weightedTexts[randomIdx]}`;
}

export function buildDicerReplyContent(message: string, copywritingSuffix: string): string {
  const cleanMessage = stripDicerTags(message);
  const cleanCopywriting = stripDicerTags(copywritingSuffix);
  return cleanMessage + (cleanCopywriting ? `\n${cleanCopywriting}` : "");
}
