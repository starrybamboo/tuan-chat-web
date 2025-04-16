/**
 * 简单的公式解析器
 * 用于处理角色数值中的公式计算，例如 "=力量+敏捷"
 */
export default class FormulaParser {
  /**
   * 检查字符串是否为公式
   * @param value 需要检查的值
   * @returns 是否为公式
   */
  static isFormula(value: unknown): boolean {
    return typeof value === "string" && value.startsWith("=");
  }

  /**
   * 解析输入值，如果是公式则保持原样，否则尝试转换为数字
   * @param formula 需要解析的值
   * @returns 解析后的值（字符串或数字）
   */
  static parse(formula: string): number | string {
    if (formula.startsWith("=")) {
      return formula; // 保持公式原样
    }
    return Number(formula) || 0;
  }

  /**
   * 计算公式结果（待实现）
   * @param formula 公式字符串
   * @param context 计算上下文，包含变量值
   * @returns 计算结果
   */
  static evaluate(
    formula: string | number,
    context: Record<string, number>,
  ): number {
    if (typeof formula === "number")
      return formula;

    try {
      const expr = formula.replace(/=/g, "").trim();
      // eslint-disable-next-line no-new-func
      const fn = new Function(...Object.keys(context), `return ${expr}`);
      return fn(...Object.values(context));
    }
    catch {
      return 0;
    }
  }
}
