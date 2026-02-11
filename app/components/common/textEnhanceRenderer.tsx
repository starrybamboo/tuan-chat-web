import React from "react";

/**
 * WebGAL 文本拓展语法渲染器
 *
 * 支持的语法：
 * 1. ע﷨: [ҪעĴ](ע) -  [Ц]()
 * 2. 文本增强语法: [文本](style=color:#66327C\; ruby=注音 style-alltext=font-style:italic\;)
 *
 * 参数说明：
 * - style: 文本颜色等样式（如 color:#FF0000）
 * - style-alltext: 作用于整体的样式，如斜体、字体大小
 * - ruby: 注音文本
 */

/** 文本拓展语法的正则表达式 */
const TEXT_ENHANCE_PATTERN = /\[([^\]]+)\]\(([^)]*)\)/g;

/** 解析参数字符串，返回键值对 */
function parseParams(paramsStr: string): Record<string, string> {
  const params: Record<string, string> = {};

  if (!paramsStr.trim()) {
    return params;
  }

  // 检测是否为增强语法（包含 style= 或 ruby= 等）
  const isEnhancedSyntax = paramsStr.includes("=");

  if (!isEnhancedSyntax) {
    // 简单注音语法：[文本](注音)
    params.ruby = paramsStr;
    return params;
  }

  // 增强语法解析：使用空格分隔不同参数
  // 例如: style-alltext=font-style:italic\;font-size:80%\; style=color:#66327C\; ruby=wen ben
  const parts = paramsStr.split(/(?<!\\)\s+/);

  for (const part of parts) {
    const eqIndex = part.indexOf("=");
    if (eqIndex > 0) {
      const key = part.substring(0, eqIndex).trim();
      // 将 \; 还原为 ;
      const value = part.substring(eqIndex + 1).trim().replace(/\\;/g, ";");
      params[key] = value;
    }
  }

  return params;
}

/** 将 CSS 字符串解析为 React 样式对象 */
function parseCSSString(cssString: string): React.CSSProperties {
  const style: Record<string, string> = {};

  if (!cssString)
    return style;

  const declarations = cssString.split(";").filter(Boolean);

  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(":");
    if (colonIndex > 0) {
      const property = declaration.substring(0, colonIndex).trim();
      const value = declaration.substring(colonIndex + 1).trim();

      // 将 kebab-case 转换为 camelCase
      const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      style[camelProperty] = value;
    }
  }

  return style;
}

interface TextEnhanceSegment {
  type: "text" | "enhanced";
  content: string;
  params?: Record<string, string>;
}

/** 解析文本内容，返回文本片段数组 */
function parseTextContent(content: string): TextEnhanceSegment[] {
  const segments: TextEnhanceSegment[] = [];
  let lastIndex = 0;

  // 重置正则表达式
  TEXT_ENHANCE_PATTERN.lastIndex = 0;

  let match = TEXT_ENHANCE_PATTERN.exec(content);
  while (match !== null) {
    // 添加匹配前的普通文本
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.substring(lastIndex, match.index),
      });
    }

    // 添加增强文本
    const text = match[1];
    const paramsStr = match[2];
    const params = parseParams(paramsStr);

    segments.push({
      type: "enhanced",
      content: text,
      params,
    });

    lastIndex = match.index + match[0].length;
    match = TEXT_ENHANCE_PATTERN.exec(content);
  }

  // 添加剩余的普通文本
  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      content: content.substring(lastIndex),
    });
  }

  return segments;
}

interface EnhancedTextProps {
  content: string;
  params: Record<string, string>;
}

/** 渲染增强文本（包含样式和/或注音） */
function EnhancedText({ content, params }: EnhancedTextProps) {
  const style = params.style ? parseCSSString(params.style) : {};
  const styleAllText = params["style-alltext"] ? parseCSSString(params["style-alltext"]) : {};
  const ruby = params.ruby;

  // 合并样式
  const combinedStyle: React.CSSProperties = {
    ...styleAllText,
    ...style,
  };

  // 如果有注音，使用 <ruby> 标签
  if (ruby) {
    return (
      <ruby style={combinedStyle}>
        {content}
        <rp>(</rp>
        <rt>{ruby}</rt>
        <rp>)</rp>
      </ruby>
    );
  }

  // 没有注音，只应用样式
  if (Object.keys(combinedStyle).length > 0) {
    return <span style={combinedStyle}>{content}</span>;
  }

  // 没有任何增强，直接返回文本
  return <>{content}</>;
}

interface TextEnhanceRendererProps {
  /** 要渲染的文本内容 */
  content: string;
  /** 额外的类名 */
  className?: string;
}

/**
 * WebGAL 文本拓展语法渲染器组件
 *
 * 使用示例：
 * ```tsx
 * <TextEnhanceRenderer content="这是[重要](style=color:#FF0000)的文字" />
 * <TextEnhanceRenderer content="日语：[笑顔](えがお)" />
 * <TextEnhanceRenderer content="[斜体文字](style=color:inherit style-alltext=font-style:italic\;)" />
 * ```
 */
export function TextEnhanceRenderer({ content, className }: TextEnhanceRendererProps) {
  // 如果内容为空或不包含增强语法，直接返回原文
  if (!content) {
    return null;
  }

  // 快速检查是否包含可能的增强语法
  if (!content.includes("[") || !content.includes("](")) {
    return <span className={className}>{content}</span>;
  }

  const segments = parseTextContent(content);

  // 如果没有解析出任何增强文本，直接返回原文
  if (segments.length === 1 && segments[0].type === "text") {
    return <span className={className}>{content}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        // 使用内容和索引组合作为 key
        const key = `${segment.type}-${index}-${segment.content.substring(0, 10)}`;
        if (segment.type === "text") {
          return <React.Fragment key={key}>{segment.content}</React.Fragment>;
        }
        return (
          <EnhancedText
            key={key}
            content={segment.content}
            params={segment.params || {}}
          />
        );
      })}
    </span>
  );
}
