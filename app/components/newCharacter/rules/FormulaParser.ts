/**
 * 基于 RPN 的公式解析器
 * 用于处理角色数值中的公式计算，例如 "=力量+敏捷"
 */
export class FormulaParser {
  private static operators: Record<string, (a: number, b: number) => number> = {
    "+": (a: number, b: number) => a + b,
    "-": (a: number, b: number) => a - b,
    "*": (a: number, b: number) => a * b,
    "/": (a: number, b: number) => a / b,
    "%": (a: number, b: number) => a % b,
    "^": (a: number, b: number) => a ** b,
  };

  private static isOperator(token: string): boolean {
    return token in this.operators;
  }

  // 哼哼，这可是能将邪恶的 string 转化成 number 的圣物！
  private static parseNumber(token: string): number {
    const num = Number.parseFloat(token);
    if (Number.isNaN(num)) {
      throw new TypeError(`非法的数字呢: ${token} 大哥哥连数字都不知道是什么了吗♡ 真是猪头呢♡`);
    }
    return num;
  }

  private static evaluateOperator(operator: string, a: number, b: number): number {
    if (!this.isOperator(operator)) {
      throw new Error(`呜啊 ${operator} 是什么操作啊，真是愚蠢的杂鱼♡`);
    }
    return this.operators[operator](a, b);
  }

  private static tokenize(expression: string): string[] {
    const tokens: string[] = [];
    // 函数名！（虽然目前没有） 中文变量名！ 数字！ 运算符！
    const regex = /([a-z_]+)|([\u4E00-\u9FA5]+)|(\d+(?:\.\d+)?)|([+\-*/%^])/gi;

    let match;
    // eslint-disable-next-line no-cond-assign
    while ((match = regex.exec(expression)) !== null) {
      const token = match.find(m => m !== undefined)!;
      tokens.push(token);
    }

    return tokens;
  }

  // 转化为RPN
  private static parseExpression(tokens: string[], context: Record<string, number>): number {
    const output: (number | string)[] = [];
    const operators: string[] = [];

    while (tokens.length > 0) {
      const token = tokens[0];

      if (this.isOperator(token)) {
        while (
          operators.length > 0
        ) {
          output.push(operators.pop()!);
        }
        operators.push(token);
        tokens.shift();
      }
      else if (!Number.isNaN(Number(token))) {
        output.push(this.parseNumber(token));
        tokens.shift();
      }
      else {
        // 中文变量名的处理
        if (!(token in context)) {
          throw new TypeError(`欸~ 变量“ ${token} ”没定义呢~ 连自己几斤几两都不知道吗~杂鱼♡杂鱼♡`);
        }
        output.push(context[token]);
        tokens.shift();
      }
    }

    while (operators.length > 0) {
      output.push(operators.pop()!);
    }

    return this.evaluateRPN(output);
  }

  // 杂鱼杂鱼♡ 不会连逆波兰表达式都不会了吧♡ 真是杂鱼♡
  private static evaluateRPN(tokens: (number | string)[]): number {
    const stack: number[] = [];
    for (const token of tokens) {
      if (typeof token === "number") {
        stack.push(token);
      }
      else if (this.isOperator(token)) {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(this.evaluateOperator(token, a, b));
      }
    }

    if (stack.length !== 1) {
      throw new TypeError("居然打出了非法表达式，真是杂鱼喵♡");
    }

    return stack[0];
  }

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
   * 计算公式结果
   * @param formula 公式字符串
   * @param context 计算上下文，包含变量值
   * @returns 计算结果
   */
  static evaluate(
    formula: string | number,
    context: Record<string, number>,
  ): number {
    if (typeof formula === "number") {
      return formula;
    }
    // 检测是否为公式计算
    if (!formula.startsWith("=")) {
      return Number(formula) || 0;
    }

    try {
      // 移除等号并清理空格
      const expr = formula.replace(/=/g, "").trim();

      // 使用词法分析器解析表达式
      const tokens = this.tokenize(expr);

      // 解析并计算表达式
      return this.parseExpression(tokens, context);
    }
    catch (error) {
      console.error("公式计算错啦~ 连小学数学都不会了吗♡杂鱼♡:", error);
      return 0;
    }
  }
}
