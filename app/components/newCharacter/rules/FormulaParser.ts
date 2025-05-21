/**
 * 基于 RPN 的公式解析器
 * 用于处理角色数值中的公式计算，例如 "=力量+敏捷"
 * 还支持一大堆乱七八糟的函数，不分大小写！还可以嵌套喵
 * 中文括号会直接被忽略，未来再更新吧
 * 彻底更新完毕就会规范化报错信息和注释，先让我玩会（
 */
export class FormulaParser {
  private static operators: Record<string, (a: number, b: number) => number> = {
    "+": (a: number, b: number) => a + b,
    "-": (a: number, b: number) => a - b,
    "*": (a: number, b: number) => a * b,
    "/": (a: number, b: number) => a / b,
    "%": (a: number, b: number) => a % b,
    "^": (a: number, b: number) => a ** b,
    ">": (a: number, b: number) => a > b ? 1 : 0,
    "<": (a: number, b: number) => a < b ? 1 : 0,
    ">=": (a: number, b: number) => a >= b ? 1 : 0,
    "<=": (a: number, b: number) => a <= b ? 1 : 0,
    "==": (a: number, b: number) => a === b ? 1 : 0,
    "!=": (a: number, b: number) => a !== b ? 1 : 0,
    "&&": (a: number, b: number) => a && b ? 1 : 0, // 新增 AND 运算符
    "||": (a: number, b: number) => a || b ? 1 : 0, // 新增 OR 运算符
  };

  private static functions: Record<string, (args: number[]) => number> = {
    max: (args: number[]) => Math.max(...args),
    min: (args: number[]) => Math.min(...args),
    abs: (args: number[]) => Math.abs(args[0]),
    // 向上取整，向下取整和四舍五入（貌似用不上？）
    ceil: (args: number[]) => Math.ceil(args[0]),
    floor: (args: number[]) => Math.floor(args[0]),
    round: (args: number[]) => Math.round(args[0]),
    sqrt: (args: number[]) => Math.sqrt(args[0]),
    pow: (args: number[]) => args[0] ** args[1],
    avg: (args: number[]) => args.reduce((a, b) => a + b, 0) / args.length,
    if: (args: number[]) => {
      if (args.length !== 3) {
        throw new Error("蠢猪~ if函数需要3个参数~ if(条件,真值,假值), 这都不知道，真是猪头程序员♡");
      }
      return args[0] ? args[1] : args[2];
    },
    cond: (args: number[]) => {
      if (args.length < 3 || args.length % 2 !== 1) {
        throw new Error("BA ↑ KA ↓ cond函数需要奇数个参数~ cond(条件1,值1,...,默认值)，果然是杂鱼♡");
      }
      for (let i = 0; i < args.length - 1; i += 2) {
        if (args[i])
          return args[i + 1];
      }
      return args[args.length - 1];
    },
  };

  // 运算优先级
  private static precedence: Record<string, number> = {
    "||": -1, // OR 优先级最低
    "&&": 0, // AND 优先级高于 OR
    ">": 1,
    "<": 1,
    ">=": 1,
    "<=": 1,
    "==": 1,
    "!=": 1,
    "+": 2,
    "-": 2,
    "*": 3,
    "/": 3,
    "%": 3,
    "^": 4,
  };

  private static isComparisonOperator(token: string): boolean {
    return [">", "<", ">=", "<=", "==", "!=", "&&", "||"].includes(token);
  }

  private static isOperator(token: string): boolean {
    return token in this.operators;
  }

  // 哼哼，这可是能将邪恶的 string 转化成 number 的圣物！
  private static isFunction(token: string): boolean {
    const lowerToken = token.toLowerCase();
    return lowerToken in this.functions;
  }

  private static getOperatorPrecedence(operator: string): number {
    return this.precedence[operator] || 0;
  }

  private static parseNumber(token: string): number {
    const num = Number.parseFloat(token);
    if (Number.isNaN(num)) {
      throw new TypeError(`非法的数字呢: ${token} 大哥哥连数字都不知道是什么了吗♡ 真是猪头呢♡`);
    }
    return num;
  }

  private static parseFunction(token: string, args: number[]): number {
    return this.functions[token](args);
  }

  private static evaluateOperator(operator: string, a: number, b: number): number {
    if (!this.isOperator(operator)) {
      throw new Error(`呜啊 ${operator} 算什么运算符啊，真是愚蠢的杂鱼♡`);
    }
    return this.operators[operator](a, b);
  }

  private static tokenize(expression: string): string[] {
    // 移除所有空白字符
    expression = expression.replace(/\s+/g, "");

    // 匹配数字、运算符、函数名、变量名和括号
    const tokens: string[] = [];
    // 添加对 && 和 || 的匹配
    const regex = /([a-z_]+)|([\u4E00-\u9FA5]+)|(\d+(?:\.\d+)?)|(,)|(>=|<=|==|!=|&&|\|\||>|<)|([+\-*/%^()])/gi;

    let match;
    // eslint-disable-next-line no-cond-assign
    while ((match = regex.exec(expression)) !== null) {
      // 只添加非空匹配
      const token = match.find(m => m !== undefined)!;
      tokens.push(token);
    }

    return tokens;
  }

  private static parseFunctionCall(tokens: string[], context: Record<string, number>): number {
    const functionName = tokens.shift()!.toLowerCase();
    if (tokens.shift() !== "(") {
      throw new TypeError("函数计算居然连 '(' 都没有? 真是个粗心的杂鱼♡");
    }

    const args: number[] = [];
    let subTokens: string[] = [];
    let parenDepth = 0;

    while (tokens.length > 0) {
      const token = tokens[0];

      // BYD我好好的一个无括号的运算被搞成了这个B样子，真是颜面尽失
      if (token === "(") {
        parenDepth++;
        subTokens.push(tokens.shift()!);
      }
      else if (token === ")") {
        if (parenDepth > 0) {
          parenDepth--;
          subTokens.push(tokens.shift()!);
        }
        else {
          // 最外层右括号，到此为止了
          if (subTokens.length > 0) {
            args.push(this.parseExpression(subTokens, context));
          }
          tokens.shift(); // 移除右括号
          break;
        }
      }
      else if (token === "," && parenDepth === 0) {
        args.push(this.parseExpression(subTokens, context));
        subTokens = [];
        tokens.shift(); // 移除逗号
      }
      else {
        subTokens.push(tokens.shift()!);
      }
    }

    return this.parseFunction(functionName, args);
  }

  private static parseExpression(tokens: string[], context: Record<string, number>): number {
    const output: (number | string)[] = [];
    const operators: string[] = [];

    while (tokens.length > 0) {
      const token = tokens[0];

      if (token === "(") {
        tokens.shift();
        output.push(this.parseExpression(tokens, context));
      }
      else if (token === ")") {
        break;
      }
      else if (this.isOperator(token) || this.isComparisonOperator(token)) {
        while (operators.length > 0
          && this.getOperatorPrecedence(operators[operators.length - 1])
          >= this.getOperatorPrecedence(token)) {
          output.push(operators.pop()!);
        }
        operators.push(token);
        tokens.shift();
      }
      else if (this.isFunction(token)) {
        output.push(this.parseFunctionCall(tokens, context));
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

  // 开始计算 PRN 表达式
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
   * 计算主函数
   * @param formula 公式字符串
   * @param context 计算上下文，包含变量值
   * @returns 计算结果
   */
  static evaluate(
    formula: string | number,
    context: Record<string, number>,
  ): number {
    // 需要检查 context 是否为纯对象且所有值为 number
    if (typeof context !== "object" || context === null || Array.isArray(context)) {
      throw new TypeError("上下文必须是键值对对象");
    }

    // 检查 context 所有值是否为 number
    for (const key in context) {
      if (typeof context[key] !== "number" || Number.isNaN(context[key])) {
        throw new TypeError(`上下文变量 "${key}" 必须是有效数字`);
      }
    }

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
    catch {
      return 0;
    }
  }
}
