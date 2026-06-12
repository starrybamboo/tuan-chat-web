import { extractTextEnhanceVisibleText as extractVisibleText } from "@/utils/textEnhanceSyntax";

const HALF_WIDTH_RANGES = [
  [0x0000, 0x007F], // ASCII（英文与半角常用符号）
  [0xFF61, 0xFF9F], // 半角日文标点/片假名
  [0xFFE8, 0xFFEE], // Halfwidth Forms
] as const;

function isHalfWidthCodePoint(codePoint: number): boolean {
  return HALF_WIDTH_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end);
}

/**
 * 将 WebGAL 文本增强语法转换为“用户可见文本”。
 * 例如：[文本](style=color:#FF0000) -> 文本
 */
export function extractTextEnhanceVisibleText(value: string): string {
  return extractVisibleText(value);
}

/**
 * 统计用户可见字符数：
 * - 中文/全角：1
 * - 英文与半角符号：0.5
 */
export function countTextEnhanceVisibleLength(value: string): number {
  let halfUnits = 0;
  const visibleText = extractTextEnhanceVisibleText(value);
  for (const char of visibleText) {
    const codePoint = char.codePointAt(0) ?? 0;
    halfUnits += isHalfWidthCodePoint(codePoint) ? 1 : 2;
  }
  return halfUnits / 2;
}

/**
 * 将长度格式化为 UI 文本，保持 0.5 粒度（如 39.5、40）。
 */
export function formatTextEnhanceVisibleLength(length: number): string {
  return Number.isInteger(length) ? String(length) : length.toFixed(1);
}
