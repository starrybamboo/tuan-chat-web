import React from "react";
import {
  parseTextEnhanceCSSString,
  parseTextEnhanceSegments,
} from "@/utils/textEnhanceSyntax";

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

interface EnhancedTextProps {
  content: string;
  params: Record<string, string>;
}

/** 渲染增强文本（包含样式和/或注音） */
function EnhancedText({ content, params }: EnhancedTextProps) {
  const style = params.style ? parseTextEnhanceCSSString(params.style) : {};
  const styleAllText = params["style-alltext"] ? parseTextEnhanceCSSString(params["style-alltext"]) : {};
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

  const segments = parseTextEnhanceSegments(content);

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
