import { extractTextEnhanceVisibleText } from "@/utils/textEnhanceSyntax";

export type TextStyleSyntaxOptions = {
  animation?: string;
  backgroundColor?: string;
  bold?: boolean;
  border?: string;
  borderRadius?: string;
  color?: string;
  customStyle?: string;
  customStyleAllText?: string;
  filter?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  headingLevel?: 1 | 2 | 3;
  italic?: boolean;
  letterSpacing?: string;
  lineHeight?: string;
  margin?: string;
  opacity?: string;
  padding?: string;
  ruby?: string;
  strikethrough?: boolean;
  textAlign?: string;
  textShadow?: string;
  textStroke?: string;
  textTransform?: string;
  transform?: string;
  underline?: boolean;
  wordSpacing?: string;
};

function normalizeCssDeclaration(declaration: string): string {
  return declaration
    .trim()
    .replace(/\\;/g, ";")
    .replace(/;+$/g, "")
    .trim();
}

function normalizeCssDeclarations(css: string | undefined): string[] {
  if (!css?.trim()) {
    return [];
  }

  return css
    .replace(/\\;/g, ";")
    .split(";")
    .map(normalizeCssDeclaration)
    .filter(Boolean);
}

function serializeCssDeclarations(declarations: string[]): string {
  return declarations.map(normalizeCssDeclaration).filter(Boolean).map(item => `${item}\\;`).join("");
}

function getHeadingCssDeclarations(level: 1 | 2 | 3 | undefined): string[] {
  switch (level) {
    case 1:
      return ["font-size:200%", "font-weight:bold", "line-height:1.2"];
    case 2:
      return ["font-size:150%", "font-weight:bold", "line-height:1.25"];
    case 3:
      return ["font-size:125%", "font-weight:bold", "line-height:1.35"];
    default:
      return [];
  }
}

/**
 * 将工具栏选项编码成 WebGAL 文本拓展语法。
 */
export function buildTextStyleSyntax(text: string, options: TextStyleSyntaxOptions): string {
  const content = String(text ?? "");
  if (!content) {
    return "";
  }

  const styleDeclarations = [
    ...(options.color ? [`color:${options.color}`] : []),
    ...(options.backgroundColor ? [`background-color:${options.backgroundColor}`] : []),
    ...normalizeCssDeclarations(options.customStyle),
  ];
  const textDecoration = [
    ...(options.underline ? ["underline"] : []),
    ...(options.strikethrough ? ["line-through"] : []),
  ].join(" ");
  const styleAllTextDeclarations = [
    ...getHeadingCssDeclarations(options.headingLevel),
    ...(options.italic ? ["font-style:italic"] : []),
    ...(options.bold ? ["font-weight:bold"] : []),
    ...(textDecoration ? [`text-decoration:${textDecoration}`] : []),
    ...(options.fontSize ? [`font-size:${options.fontSize}`] : []),
    ...(options.fontWeight ? [`font-weight:${options.fontWeight}`] : []),
    ...(options.fontFamily ? [`font-family:${options.fontFamily}`] : []),
    ...(options.lineHeight ? [`line-height:${options.lineHeight}`] : []),
    ...(options.letterSpacing ? [`letter-spacing:${options.letterSpacing}`] : []),
    ...(options.wordSpacing ? [`word-spacing:${options.wordSpacing}`] : []),
    ...(options.textAlign ? [`text-align:${options.textAlign}`] : []),
    ...(options.textTransform ? [`text-transform:${options.textTransform}`] : []),
    ...(options.opacity ? [`opacity:${options.opacity}`] : []),
    ...(options.textShadow ? [`text-shadow:${options.textShadow}`] : []),
    ...(options.textStroke ? [`-webkit-text-stroke:${options.textStroke}`] : []),
    ...(options.filter ? [`filter:${options.filter}`] : []),
    ...(options.transform ? [`display:inline-block`, `transform:${options.transform}`] : []),
    ...(options.animation ? [`display:inline-block`, `animation:${options.animation}`] : []),
    ...(options.border ? [`border:${options.border}`] : []),
    ...(options.borderRadius ? [`border-radius:${options.borderRadius}`] : []),
    ...(options.margin ? [`margin:${options.margin}`] : []),
    ...(options.padding ? [`padding:${options.padding}`] : []),
    ...normalizeCssDeclarations(options.customStyleAllText),
  ];
  const params: string[] = [];

  if (styleAllTextDeclarations.length > 0) {
    params.push(`style-alltext=${serializeCssDeclarations(styleAllTextDeclarations)}`);
  }

  if (styleDeclarations.length > 0) {
    params.push(`style=${serializeCssDeclarations(styleDeclarations)}`);
  }
  else if (styleAllTextDeclarations.length > 0) {
    params.push("style=color:inherit\\;");
  }

  const ruby = String(options.ruby ?? "").trim();
  if (ruby) {
    params.push(`ruby=${ruby}`);
  }

  return params.length > 0 ? `[${content}](${params.join(" ")})` : content;
}

/**
 * 清除选中文本中的 WebGAL 富文本/注音标记，只保留用户可见文字。
 */
export function clearTextStyleSyntax(text: string): string {
  return extractTextEnhanceVisibleText(String(text ?? ""));
}
