export type TextEnhanceSegment = {
  content: string;
  rawEnd: number;
  rawStart: number;
  type: "text" | "enhanced";
  visibleEnd: number;
  visibleStart: number;
  params?: Record<string, string>;
};

export function parseTextEnhanceParams(paramsStr: string): Record<string, string> {
  const params: Record<string, string> = {};
  const rawParams = paramsStr.trim();

  if (!rawParams)
    return params;

  if (!rawParams.includes("=")) {
    params.ruby = rawParams;
    return params;
  }

  const keyMatches = [...rawParams.matchAll(/(?:^|\s)([a-z][\w-]*)=/gi)];
  if (keyMatches.length === 0)
    return params;

  for (let index = 0; index < keyMatches.length; index += 1) {
    const match = keyMatches[index];
    const key = match[1]?.trim();
    if (!key)
      continue;
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = keyMatches[index + 1]?.index ?? rawParams.length;
    const value = rawParams.substring(valueStart, valueEnd).trim().replace(/\\;/g, ";").replace(/\\,/g, ",");
    params[key] = value;
  }

  return params;
}

export function parseTextEnhanceCSSString(cssString: string): Record<string, string> {
  const style: Record<string, string> = {};
  if (!cssString)
    return style;

  const declarations = cssString.split(";").filter(Boolean);
  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(":");
    if (colonIndex <= 0)
      continue;
    const property = declaration.substring(0, colonIndex).trim();
    const value = declaration.substring(colonIndex + 1).trim();
    const camelProperty = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    style[camelProperty] = value;
  }

  return style;
}

function findTextEnhanceParamEnd(content: string, paramsStart: number): number {
  let parenDepth = 0;
  for (let index = paramsStart; index < content.length; index += 1) {
    const char = content[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
      continue;
    }
    if (char === ")") {
      if (parenDepth === 0)
        return index;
      parenDepth -= 1;
    }
  }
  return -1;
}

function findNextTextEnhanceMatch(content: string, fromIndex: number) {
  let searchIndex = fromIndex;
  while (searchIndex < content.length) {
    const rawStart = content.indexOf("[", searchIndex);
    if (rawStart < 0)
      return null;

    const textEnd = content.indexOf("](", rawStart + 1);
    if (textEnd < 0)
      return null;

    const text = content.slice(rawStart + 1, textEnd);
    const paramsStart = textEnd + 2;
    const paramsEnd = findTextEnhanceParamEnd(content, paramsStart);
    if (text.length > 0 && paramsEnd >= 0) {
      return { params: content.slice(paramsStart, paramsEnd), rawEnd: paramsEnd + 1, rawStart, text };
    }

    searchIndex = rawStart + 1;
  }

  return null;
}

export function parseTextEnhanceSegments(content: string): TextEnhanceSegment[] {
  const segments: TextEnhanceSegment[] = [];
  let lastIndex = 0;
  let visibleOffset = 0;

  let match = findNextTextEnhanceMatch(content, lastIndex);
  while (match !== null) {
    if (match.rawStart > lastIndex) {
      const text = content.substring(lastIndex, match.rawStart);
      segments.push({ type: "text", content: text, rawStart: lastIndex, rawEnd: match.rawStart, visibleStart: visibleOffset, visibleEnd: visibleOffset + text.length });
      visibleOffset += text.length;
    }

    const text = match.text;
    segments.push({ type: "enhanced", content: text, params: parseTextEnhanceParams(match.params), rawStart: match.rawStart, rawEnd: match.rawEnd, visibleStart: visibleOffset, visibleEnd: visibleOffset + text.length });
    visibleOffset += text.length;
    lastIndex = match.rawEnd;
    match = findNextTextEnhanceMatch(content, lastIndex);
  }

  if (lastIndex < content.length) {
    const text = content.substring(lastIndex);
    segments.push({ type: "text", content: text, rawStart: lastIndex, rawEnd: content.length, visibleStart: visibleOffset, visibleEnd: visibleOffset + text.length });
  }

  return segments;
}

export function extractTextEnhanceVisibleText(value: string): string {
  const content = String(value ?? "");
  if (!content.includes("[") || !content.includes("]("))
    return content;
  return parseTextEnhanceSegments(content).map(segment => segment.content).join("");
}
