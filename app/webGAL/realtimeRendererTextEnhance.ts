/**
 * WebGAL 文本拓展语法处理工具。
 */
export const TextEnhanceSyntax = {
  PATTERN: /\[([^\]]+)\]\(([^)]+)\)/g,

  isEnhancedSyntax(params: string): boolean {
    return params.includes("style=");
  },

  processContent(content: string): string {
    const syntaxBlocks: string[] = [];
    let processed = content.replace(this.PATTERN, (match, _text, _params) => {
      const index = syntaxBlocks.length;
      syntaxBlocks.push(match);
      return `\x00SYNTAX_BLOCK_${index}\x00`;
    });

    processed = processed
      .replace(/\r?\n+/g, "|")
      .replace(/;/g, "；")
      .replace(/:/g, "：");

    syntaxBlocks.forEach((block, index) => {
      processed = processed.replace(`\x00SYNTAX_BLOCK_${index}\x00`, block);
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
