// 骰子表达式解析器
// TODO: 修复连续d解析问题（因该功能使用较少，暂不修复）
type TokenType = "number" | "operator" | "paren" | "dice";

type Token = {
  type: TokenType;
  value: string | number;
  position: number;
};

type ExpressionValue = {
  value: number; // 表达式的数值结果
  expr: string; // 表达式字符串表示
  isDice: boolean; // 是否是骰子表达式
  diceDetails?: string; // 骰子展开细节（如有）
  hasNestedDice?: boolean; // 是否包含嵌套骰子（用于检测连续d）
};

class ExpressionParser {
  private tokens: Token[] = [];
  private currentIndex = 0;
  private diceSize = 100;
  private consecutiveDiceDetected = false; // 检测连续d操作符

  // 运算符优先级表
  private precedence: Record<string, number> = {
    "#": 0,
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
    "d": 3,
  };

  // 全角符号映射
  private operatorMap: Record<string, string> = {
    "（": "(",
    "）": ")",
    "【": "(",
    "】": ")",
    "｛": "(",
    "｝": ")",
    "「": "(",
    "」": ")",
    "『": "(",
    "』": ")",
    "：": "/",
    ":": "/",
    "＋": "+",
    "－": "-",
    "＊": "*",
    "／": "/",
  };

  constructor(diceSize: number = 100) {
    this.diceSize = diceSize;
  }

  /**
   * 表达式预处理
   * 1. 转换全角符号
   * 2. 处理d%特殊语法
   * 3. 为骰子表达式添加默认参数
   *
   * @param expr 原始表达式
   * @returns 标准化表达式
   */
  private preprocess(expr: string): string {
    let processed = "";
    for (const char of expr) {
      processed += this.operatorMap[char] || char;
    }

    let result = "";
    let i = 0;

    while (i < processed.length) {
      const current = processed[i];

      // 处理开头的d -> 1d
      if (i === 0 && current === "d") {
        result += "1d";
        i++;
        continue;
      }

      if (current === "d") {
        // 处理d% -> 1d100
        if (i + 1 < processed.length && processed[i + 1] === "%") {
          if (i === 0 || !/\d/.test(processed[i - 1])) {
            result += "1";
          }
          result += "d100";
          i += 2;
          continue;
        }

        // 检查左侧是否需要默认值
        if (i === 0 || !/\d/.test(processed[i - 1])) {
          result += "1";
        }

        result += "d";

        // 检查右侧是否需要默认值
        let nextIndex = i + 1;
        while (nextIndex < processed.length && /\s/.test(processed[nextIndex])) {
          nextIndex++;
        }

        if (nextIndex >= processed.length || !/[\d(]/.test(processed[nextIndex])) {
          result += this.diceSize.toString();
        }
      }
      else {
        result += current;
      }
      i++;
    }

    return result;
  }

  /**
   * 词法分析 - 将表达式拆分为token
   * @param expr 预处理后的表达式
   */
  private tokenize(expr: string): void {
    this.tokens = [];
    this.currentIndex = 0;
    let position = 0;

    while (position < expr.length) {
      const char = expr[position];

      // 跳过空白字符
      if (/\s/.test(char)) {
        position++;
        continue;
      }

      // 处理数字
      if (/\d/.test(char)) {
        let numStr = "";
        while (position < expr.length && /\d/.test(expr[position])) {
          numStr += expr[position++];
        }
        this.tokens.push({
          type: "number",
          value: Number.parseInt(numStr, 10),
          position: position - numStr.length,
        });
        continue;
      }

      // 处理运算符和括号
      if (/[+\-*/d()]/.test(char)) {
        const type = char === "(" || char === ")" ? "paren" : "operator";
        this.tokens.push({ type, value: char, position });
        position++;
        continue;
      }

      throw new Error(`无法识别的字符: ${char} (位置: ${position})`);
    }

    // 添加结束标记
    this.tokens.push({ type: "operator", value: "#", position: expr.length });
  }

  /**
   * 解析表达式主入口
   * @param expr 原始表达式
   * @returns 解析结果
   */
  parse(expr: string): { result: number; expanded: string } {
    this.consecutiveDiceDetected = false;
    const processed = this.preprocess(expr);
    this.tokenize(processed);

    if (this.tokens.length === 1) {
      return { result: 0, expanded: "0" };
    }

    // 计算表达式值并获取表达式对象
    const exprObj = this.evaluateExpression();

    // 生成展开表达式
    let expanded: string;
    if (this.consecutiveDiceDetected) {
      // 检测到连续d操作符
      expanded = "[略]";
    }
    else if (exprObj.isDice) {
      // 骰子表达式：显示细节
      expanded = exprObj.diceDetails
        ? `${exprObj.expr}${exprObj.diceDetails}`
        : exprObj.expr;
    }
    else {
      // 纯数学表达式
      expanded = processed;
    }

    return { result: exprObj.value, expanded };
  }

  /**
   * 计算表达式值（使用双栈算法）
   * @returns 表达式值对象
   */
  private evaluateExpression(): ExpressionValue {
    const values: ExpressionValue[] = []; // 值栈（存储表达式对象）
    const ops: string[] = []; // 操作符栈

    while (this.currentIndex < this.tokens.length) {
      const token = this.tokens[this.currentIndex++];

      // 处理数字：创建简单表达式对象
      if (token.type === "number") {
        const num = token.value as number;
        values.push({
          value: num,
          expr: num.toString(),
          isDice: false,
        });
        continue;
      }

      // 处理左括号
      if (token.value === "(") {
        ops.push(token.value as string);
        continue;
      }

      // 处理右括号
      if (token.value === ")") {
        while (ops.length > 0 && ops[ops.length - 1] !== "(") {
          this.applyOp(values, ops.pop()!);
        }

        if (ops.length === 0)
          throw new Error("括号不匹配");
        ops.pop(); // 弹出左括号
        continue;
      }

      // 处理运算符
      const currentOp = token.value as string;

      // 检查连续d操作符（当前是d且栈顶也是d）
      if (currentOp === "d" && ops.length > 0 && ops[ops.length - 1] === "d") {
        this.consecutiveDiceDetected = true;
      }

      // 弹出并计算更高优先级的运算符
      while (
        ops.length > 0
        && this.precedence[ops[ops.length - 1]] >= this.precedence[currentOp]
      ) {
        this.applyOp(values, ops.pop()!);
      }

      ops.push(currentOp);
    }

    // 处理剩余操作符
    while (ops.length > 0) {
      this.applyOp(values, ops.pop()!);
    }

    // 结果验证
    if (values.length !== 1)
      throw new Error("表达式不完整");

    return values[0];
  }

  /**
   * 应用运算符计算
   * @param values 值栈
   * @param op 运算符
   */
  private applyOp(values: ExpressionValue[], op: string): void {
    if (op === "#")
      return;

    if (values.length < 2) {
      throw new Error(`运算符 ${op} 缺少操作数`);
    }

    const b = values.pop()!;
    const a = values.pop()!;

    // 处理骰子操作符
    if (op === "d") {
      // 验证参数
      if (a.value <= 0)
        throw new Error("骰子数量必须为正数");
      if (b.value <= 0)
        throw new Error("骰子面数必须为正数");

      // 掷骰子
      const { total, rolls } = this.rollDiceHandle(a.value, b.value);

      // 构建表达式对象
      const exprValue: ExpressionValue = {
        value: total,
        expr: `${a.expr}d${b.expr}`,
        isDice: true,
      };

      // 添加骰子细节（如果没有嵌套骰子）
      if (!a.isDice && !b.isDice) {
        exprValue.diceDetails = `[${rolls.join("+")}]`;
      }

      values.push(exprValue);
    }
    // 处理其他运算符
    else {
      // 计算结果
      let result: number;
      switch (op) {
        case "+":
          result = a.value + b.value;
          break;
        case "-":
          result = a.value - b.value;
          break;
        case "*":
          result = a.value * b.value;
          break;
        case "/":
          if (b.value === 0)
            throw new Error("除零错误");
          result = Math.round(a.value / b.value);
          break;
        default: throw new Error(`未知运算符: ${op}`);
      }

      // 构建表达式对象
      values.push({
        value: result,
        expr: `(${a.expr}${op}${b.expr})`,
        isDice: a.isDice || b.isDice, // 如果任一操作数是骰子，则标记为骰子表达式
      });
    }
  }

  /**
   * 模拟掷骰子
   * @param count 骰子数量
   * @param sides 骰子面数
   * @returns 总点数和每个骰子的点数
   */
  private rollDiceHandle(count: number, sides: number): { total: number; rolls: number[] } {
    const rolls: number[] = [];
    let total = 0;

    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      total += roll;
    }

    return { total, rolls };
  }

  /**
   * 计算表达式范围（最小/最大值）
   * @param expr 原始表达式
   * @returns 范围对象
   */
  range(expr: string): { min: number; max: number } {
    const processed = this.preprocess(expr);
    this.tokenize(processed);

    if (this.tokens.length === 1) {
      return { min: 0, max: 0 };
    }

    return this.evaluateRange();
  }

  /**
   * 范围计算核心
   * @returns 范围对象
   */
  private evaluateRange(): { min: number; max: number } {
    const minValues: number[] = [];
    const maxValues: number[] = [];
    const ops: string[] = [];

    while (this.currentIndex < this.tokens.length) {
      const token = this.tokens[this.currentIndex++];

      // 处理数字
      if (token.type === "number") {
        const num = token.value as number;
        minValues.push(num);
        maxValues.push(num);
        continue;
      }

      // 处理括号
      if (token.value === "(") {
        ops.push(token.value as string);
        continue;
      }

      if (token.value === ")") {
        while (ops.length > 0 && ops[ops.length - 1] !== "(") {
          this.applyRangeOp(minValues, maxValues, ops.pop()!);
        }

        if (ops.length === 0)
          throw new Error("括号不匹配");
        ops.pop();
        continue;
      }

      // 处理运算符
      const op = token.value as string;
      while (
        ops.length > 0
        && this.precedence[ops[ops.length - 1]] >= this.precedence[op]
      ) {
        this.applyRangeOp(minValues, maxValues, ops.pop()!);
      }

      ops.push(op);
    }

    // 处理剩余操作符
    while (ops.length > 0) {
      this.applyRangeOp(minValues, maxValues, ops.pop()!);
    }

    if (minValues.length !== 1 || maxValues.length !== 1) {
      throw new Error("表达式不完整");
    }

    return { min: minValues[0], max: maxValues[0] };
  }

  /**
   * 应用运算符计算范围
   * @param minValues 最小值栈
   * @param maxValues 最大值栈
   * @param op 运算符
   */
  private applyRangeOp(minValues: number[], maxValues: number[], op: string): void {
    if (op === "#")
      return;

    if (minValues.length < 2 || maxValues.length < 2) {
      throw new Error(`运算符 ${op} 缺少操作数`);
    }

    const bMin = minValues.pop()!;
    const bMax = maxValues.pop()!;
    const aMin = minValues.pop()!;
    const aMax = maxValues.pop()!;

    switch (op) {
      case "+":
        minValues.push(aMin + bMin);
        maxValues.push(aMax + bMax);
        break;
      case "-":
        minValues.push(aMin - bMax);
        maxValues.push(aMax - bMin);
        break;
      case "*":
        minValues.push(aMin * bMin);
        maxValues.push(aMax * bMax);
        break;
      case "/":
        if (bMin <= 0 && bMax >= 0)
          throw new Error("除数可能为0");
        minValues.push(Math.round(aMin / bMax));
        maxValues.push(Math.round(aMax / bMin));
        break;
      case "d":
        minValues.push(aMin); // 最小点数 = 骰子数量
        maxValues.push(aMax * bMax); // 最大点数 = 骰子数量 × 最大面数
        break;
      default:
        throw new Error(`未知运算符: ${op}`);
    }
  }
}

// ===================== 导出函数 =====================

/**
 * 骰点表达式解析器
 * @param dice 骰点表达式
 * @param diceSize 默认骰子面数
 * @returns 解析结果
 *
 * @example
 * roll("2d6+3") // { result: 8, expanded: "2d6[1+5]+3" }
 * roll("1d10d100") // { result: 42, expanded: "[略]" }
 */
export function roll(dice: string, diceSize: number = 100): { result: number; expanded: string } {
  const parser = new ExpressionParser(diceSize);
  return parser.parse(dice);
}

/**
 * 计算表达式范围
 * @param dice 骰点表达式
 * @param diceSize 默认骰子面数
 * @returns 范围对象
 *
 * @example
 * range("2d6+3") // { min: 5, max: 15 }
 */
export function range(dice: string, diceSize: number = 100): { min: number; max: number } {
  const parser = new ExpressionParser(diceSize);
  return parser.range(dice);
}

export function rollDice(diceSize: number = 100): number {
  return Math.floor(Math.random() * diceSize) + 1;
}

export function parseDiceExpression(expr: string): { result: { value: number; expanded: string }; possibleRange: { max: number; min: number } } {
  const parser = new ExpressionParser(100);
  const result = parser.parse(expr);
  const possibleRange = parser.range(expr);
  return { result: { value: result.result, expanded: result.expanded }, possibleRange };
}
