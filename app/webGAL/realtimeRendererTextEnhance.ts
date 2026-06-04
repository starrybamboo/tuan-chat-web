import { parseTextEnhanceSegments } from "@/utils/textEnhanceSyntax";

/**
 * WebGAL 文本拓展语法处理工具。
 */
export const TextEnhanceSyntax = {
  PATTERN: /\[([^\]]+)\]\(([^)]*)\)/g,

  isEnhancedSyntax(params: string): boolean {
    return params.includes("style=");
  },

  processContent(content: string): string {
    const normalizedContent = normalizeHtmlRichTextSyntax(String(content ?? ""));
    const syntaxBlocks: string[] = [];
    let processed = protectTextEnhanceBlocks(normalizedContent, (block) => {
      const index = syntaxBlocks.length;
      syntaxBlocks.push(normalizeTextEnhanceBlock(block));
      return buildSyntaxPlaceholder(index);
    });

    processed = processed
      .replace(/\r?\n+/g, "|")
      .replace(/;/g, "；")
      .replace(/:/g, "：");

    syntaxBlocks.forEach((block, index) => {
      processed = processed.replace(buildSyntaxPlaceholder(index), block);
    });

    return processed;
  },

  build(text: string, options: {
    style?: string;
    styleAllText?: string;
    ruby?: string;
  }): string {
    const params: string[] = [];

    if (options.styleAllText) {
      params.push(`style-alltext=${options.styleAllText.replace(/;/g, "\\;")}`);
    }

    if (options.style) {
      params.push(`style=${options.style.replace(/;/g, "\\;")}`);
    }

    if (options.ruby) {
      params.push(`ruby=${options.ruby}`);
    }

    if (params.length === 0) {
      return `[${text}]()`;
    }

    return `[${text}](${params.join(" ")})`;
  },

  buildRuby(text: string, ruby: string): string {
    return `[${text}](${ruby})`;
  },

  buildColoredText(text: string, color: string): string {
    return this.build(text, { style: `color:${color}` });
  },

  buildItalicText(text: string): string {
    return this.build(text, {
      styleAllText: "font-style:italic",
      style: "color:inherit",
    });
  },

  buildStyledText(text: string, options: {
    color?: string;
    italic?: boolean;
    fontSize?: string;
    ruby?: string;
  }): string {
    const styleAllTextParts: string[] = [];
    const styleParts: string[] = [];

    if (options.italic) {
      styleAllTextParts.push("font-style:italic");
    }

    if (options.fontSize) {
      styleAllTextParts.push(`font-size:${options.fontSize}`);
    }

    if (options.color) {
      styleParts.push(`color:${options.color}`);
    }

    return this.build(text, {
      styleAllText: styleAllTextParts.length > 0 ? styleAllTextParts.join(";") : undefined,
      style: styleParts.length > 0 ? styleParts.join(";") : "color:inherit",
      ruby: options.ruby,
    });
  },
};

function buildSyntaxPlaceholder(index: number): string {
  return `\x00SYNTAX_BLOCK_${index}\x00`;
}

function protectTextEnhanceBlocks(content: string, replaceBlock: (block: string) => string): string {
  if (!content.includes("[") || !content.includes("](")) {
    return content;
  }

  const segments = parseTextEnhanceSegments(content);
  if (segments.every(segment => segment.type !== "enhanced")) {
    return content;
  }

  let cursor = 0;
  let result = "";
  for (const segment of segments) {
    if (segment.type !== "enhanced") {
      continue;
    }
    result += content.slice(cursor, segment.rawStart);
    result += replaceBlock(content.slice(segment.rawStart, segment.rawEnd));
    cursor = segment.rawEnd;
  }
  result += content.slice(cursor);
  return result;
}

function normalizeTextEnhanceBlock(block: string): string {
  const textEnd = block.indexOf("](");
  if (!block.startsWith("[") || textEnd < 0 || !block.endsWith(")")) {
    return block;
  }

  const text = block.slice(1, textEnd);
  const params = block.slice(textEnd + 2, -1);
  // WebGAL 引擎在增强参数里用 ~ 还原 CSS 冒号；避免脚本参数层把 style 中的冒号误切。
  const normalizedParams = params.replace(/:/g, "~");
  return `[${text}](${normalizedParams})`;
}

function normalizeHtmlRichTextSyntax(content: string): string {
  return content
    .replace(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi, (_match, rawAttrs: string, rawInner: string) => {
      const style = extractHtmlAttribute(rawAttrs, "style");
      const text = stripHtmlTags(rawInner);
      if (!style || !text) {
        return text;
      }
      return `[${text}](style=${serializeStyleForWebgal(style)})`;
    })
    .replace(/<font\b([^>]*)>([\s\S]*?)<\/font>/gi, (_match, rawAttrs: string, rawInner: string) => {
      const color = extractHtmlAttribute(rawAttrs, "color");
      const text = stripHtmlTags(rawInner);
      if (!color || !text) {
        return text;
      }
      return `[${text}](style=${serializeStyleForWebgal(`color:${color}`)})`;
    });
}

function extractHtmlAttribute(attrs: string, name: string): string {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = attrs.match(pattern);
  return decodeBasicHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function stripHtmlTags(value: string): string {
  return decodeBasicHtmlEntities(String(value ?? "").replace(/<[^>]*>/g, ""));
}

function decodeBasicHtmlEntities(value: string): string {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function serializeStyleForWebgal(style: string): string {
  return style
    .split(";")
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => `${item.replace(/:/g, "~")}\\;`)
    .join("");
}
