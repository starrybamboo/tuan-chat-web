const TEXT_ENHANCE_PATTERN = /\[([^\]]+)\]\(([^)]*)\)/g;

/**
 * 将 WebGAL 文本增强语法转换为“用户可见文本”。
 * 例如：[文本](style=color:#FF0000) -> 文本
 */
export function extractTextEnhanceVisibleText(value: string): string {
  const content = String(value ?? "");
  if (!content.includes("[") || !content.includes("](")) {
    return content;
  }
  return content.replace(TEXT_ENHANCE_PATTERN, (_match, text: string) => text);
}

/**
 * 统计用户可见字符数（按 Unicode code point 计数，避免 surrogate pair 被算成 2）。
 */
export function countTextEnhanceVisibleLength(value: string): number {
  return Array.from(extractTextEnhanceVisibleText(value)).length;
}

