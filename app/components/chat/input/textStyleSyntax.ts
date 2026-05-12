export type TextStyleSyntaxOptions = {
  backgroundColor?: string;
  bold?: boolean;
  color?: string;
  customStyle?: string;
  customStyleAllText?: string;
  fontSize?: string;
  italic?: boolean;
  letterSpacing?: string;
  margin?: string;
  opacity?: string;
  padding?: string;
  ruby?: string;
  textShadow?: string;
  underline?: boolean;
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
  const styleAllTextDeclarations = [
    ...(options.italic ? ["font-style:italic"] : []),
    ...(options.bold ? ["font-weight:bold"] : []),
    ...(options.underline ? ["text-decoration:underline"] : []),
    ...(options.fontSize ? [`font-size:${options.fontSize}`] : []),
    ...(options.letterSpacing ? [`letter-spacing:${options.letterSpacing}`] : []),
    ...(options.opacity ? [`opacity:${options.opacity}`] : []),
    ...(options.textShadow ? [`text-shadow:${options.textShadow}`] : []),
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
