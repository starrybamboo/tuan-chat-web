import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import {
  parseTextEnhanceCSSString,
  parseTextEnhanceSegments,
} from "@/lib/textEnhanceSyntax";

interface EnhancedTextProps {
  content: string;
  params: Record<string, string>;
  baseStyle?: TextStyle;
}

function cssToTextStyle(css: Record<string, string>): TextStyle {
  const style: TextStyle = {};

  if (css.color) style.color = css.color;
  if (css.backgroundColor) style.backgroundColor = css.backgroundColor;
  if (css.fontWeight) style.fontWeight = css.fontWeight as TextStyle["fontWeight"];
  if (css.fontStyle) style.fontStyle = css.fontStyle as TextStyle["fontStyle"];
  if (css.textDecorationLine) style.textDecorationLine = css.textDecorationLine as TextStyle["textDecorationLine"];
  if (css.textDecoration) {
    if (css.textDecoration.includes("underline")) style.textDecorationLine = "underline";
    if (css.textDecoration.includes("line-through")) style.textDecorationLine = "line-through";
  }
  if (css.fontSize) {
    const parsed = parseFloat(css.fontSize);
    if (!Number.isNaN(parsed)) {
      if (css.fontSize.includes("%")) {
        style.fontSize = (parsed / 100) * 15;
      } else {
        style.fontSize = parsed;
      }
    }
  }
  if (css.letterSpacing) {
    const parsed = parseFloat(css.letterSpacing);
    if (!Number.isNaN(parsed)) style.letterSpacing = parsed;
  }
  if (css.opacity) {
    const parsed = parseFloat(css.opacity);
    if (!Number.isNaN(parsed)) style.opacity = parsed;
  }
  if (css.lineHeight) {
    const parsed = parseFloat(css.lineHeight);
    if (!Number.isNaN(parsed)) {
      style.lineHeight = parsed > 10 ? parsed : parsed * 15;
    }
  }

  return style;
}

function EnhancedText({ content, params, baseStyle }: EnhancedTextProps) {
  const styleCSS = params.style ? parseTextEnhanceCSSString(params.style) : {};
  const styleAllTextCSS = params["style-alltext"] ? parseTextEnhanceCSSString(params["style-alltext"]) : {};
  const ruby = params.ruby;

  const combinedCSS = { ...styleAllTextCSS, ...styleCSS };
  const textStyle = cssToTextStyle(combinedCSS);

  const hasStyle = Object.keys(textStyle).length > 0;

  if (ruby) {
    return (
      <Text style={[baseStyle, hasStyle ? textStyle : undefined]}>
        {content}
        <Text style={{ fontSize: 10, color: "#8b949e" }}>{`(${ruby})`}</Text>
      </Text>
    );
  }

  if (hasStyle) {
    return <Text style={[baseStyle, textStyle]}>{content}</Text>;
  }

  return <Text style={baseStyle}>{content}</Text>;
}

interface TextEnhanceRendererProps {
  content: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

export function TextEnhanceRenderer({ content, numberOfLines, style }: TextEnhanceRendererProps) {
  if (!content) return null;

  if (!content.includes("[") || !content.includes("](")) {
    return <Text numberOfLines={numberOfLines} style={style}>{content}</Text>;
  }

  const segments = parseTextEnhanceSegments(content);

  if (segments.length === 1 && segments[0].type === "text") {
    return <Text numberOfLines={numberOfLines} style={style}>{content}</Text>;
  }

  const flatStyle = StyleSheet.flatten(style) ?? undefined;

  return (
    <Text numberOfLines={numberOfLines} style={style}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <React.Fragment key={index}>{segment.content}</React.Fragment>;
        }
        return (
          <EnhancedText
            key={index}
            content={segment.content}
            params={segment.params || {}}
            baseStyle={flatStyle}
          />
        );
      })}
    </Text>
  );
}
