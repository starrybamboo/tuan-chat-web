export const TEXT_ENHANCE_PATTERN = /\[([^\]]+)\]\(([^)]*)\)/g;

export type TextEnhanceSegment = {
  content: string;
  rawEnd: number;
  rawStart: number;
  type: "text" | "enhanced";
  visibleEnd: number;
  visibleStart: number;
  params?: Record<string, string>;
};

/**
 * 解析 WebGAL 文本增强语法参数。
 */
export function parseTextEnhanceParams(paramsStr: string): Record<string, string> {
  const params: Record<string, string> = {};
  const rawParams = paramsStr.trim();

  if (!rawParams) {
    return params;
  }

  if (!rawParams.includes("=")) {
    params.ruby = rawParams;
    return params;
  }

  const keyMatches = [...rawParams.matchAll(/(?:^|\s)([a-z][\w-]*)=/gi)];
  if (keyMatches.length === 0) {
    return params;
  }

  for (let index = 0; index < keyMatches.length; index += 1) {
    const match = keyMatches[index];
    const key = match[1]?.trim();
    if (!key) {
      continue;
    }
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = keyMatches[index + 1]?.index ?? rawParams.length;
    const value = rawParams.substring(valueStart, valueEnd).trim().replace(/\\;/g, ";");
    params[key] = value;
  }

  return params;
}

/**
 * 将 CSS 字符串解析为可直接赋给 React style/HTMLElement.style 的对象。
 */
export function parseTextEnhanceCSSString(cssString: string): Record<string, string> {
  const style: Record<string, string> = {};
  if (!cssString) {
    return style;
  }

  const declarations = cssString.split(";").filter(Boolean);
  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(":");
    if (colonIndex <= 0) {
      continue;
    }
    const property = declaration.substring(0, colonIndex).trim();
    const value = declaration.substring(colonIndex + 1).trim();
    const camelProperty = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    style[camelProperty] = value;
  }

  return style;
}

/**
 * 解析文本增强语法，并保留原始字符串范围和可见文本范围。
 */
export function parseTextEnhanceSegments(content: string): TextEnhanceSegment[] {
  const segments: TextEnhanceSegment[] = [];
  let lastIndex = 0;
  let visibleOffset = 0;

  TEXT_ENHANCE_PATTERN.lastIndex = 0;
  let match = TEXT_ENHANCE_PATTERN.exec(content);
  while (match !== null) {
    if (match.index > lastIndex) {
      const text = content.substring(lastIndex, match.index);
      segments.push({
        type: "text",
        content: text,
        rawStart: lastIndex,
        rawEnd: match.index,
        visibleStart: visibleOffset,
        visibleEnd: visibleOffset + text.length,
      });
      visibleOffset += text.length;
    }

    const text = match[1];
    segments.push({
      type: "enhanced",
      content: text,
      params: parseTextEnhanceParams(match[2]),
      rawStart: match.index,
      rawEnd: match.index + match[0].length,
      visibleStart: visibleOffset,
      visibleEnd: visibleOffset + text.length,
    });
    visibleOffset += text.length;
    lastIndex = match.index + match[0].length;
    match = TEXT_ENHANCE_PATTERN.exec(content);
  }

  if (lastIndex < content.length) {
    const text = content.substring(lastIndex);
    segments.push({
      type: "text",
      content: text,
      rawStart: lastIndex,
      rawEnd: content.length,
      visibleStart: visibleOffset,
      visibleEnd: visibleOffset + text.length,
    });
  }

  return segments;
}

/**
 * 将 WebGAL 文本增强语法转换为用户可见文本。
 */
export function extractTextEnhanceVisibleText(value: string): string {
  const content = String(value ?? "");
  if (!content.includes("[") || !content.includes("](")) {
    return content;
  }
  return parseTextEnhanceSegments(content).map(segment => segment.content).join("");
}

/**
 * 把预览态 DOM 的可见文本偏移转换为原始字符串偏移。
 */
export function visibleOffsetToTextEnhanceRawOffset(content: string, visibleOffset: number): number {
  const normalizedOffset = Math.max(0, Math.floor(visibleOffset));
  if (!content.includes("[") || !content.includes("](")) {
    return Math.min(normalizedOffset, content.length);
  }

  const segments = parseTextEnhanceSegments(content);
  for (const segment of segments) {
    if (normalizedOffset < segment.visibleStart) {
      return segment.rawStart;
    }
    if (normalizedOffset <= segment.visibleEnd) {
      if (segment.type === "enhanced" && normalizedOffset === segment.visibleEnd) {
        return segment.rawEnd;
      }
      return segment.rawStart + Math.min(normalizedOffset - segment.visibleStart, segment.content.length);
    }
  }

  return content.length;
}
