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
  detailed: string; // 带细节的表达式字符串
  isDice: boolean; // 是否是骰子表达式
};

class ExpressionParser {
  private tokens: Token[] = [];
  private currentIndex = 0;
  private diceSize = 100;
  private consecutiveDiceDetected = false;

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
    "％": "%",
    "%": "%",
  };

  constructor(diceSize: number = 100) {
    this.diceSize = diceSize;
  }

  /**
   * 表达式预处理
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
          i += 2; // 跳过%符号
          continue;
        }

        // 检查左侧是否需要默认值
        if (i === 0 || !/\d/.test(processed[i - 1])) {
          result += "1";
        }

        result += "d";

        // 处理右侧默认值
        let nextIndex = i + 1;
        while (nextIndex < processed.length && /\s/.test(processed[nextIndex])) {
          nextIndex++;
        }

        // 检查是否到达末尾或遇到运算符
        if (nextIndex >= processed.length || !/[\d(]/.test(processed[nextIndex])) {
          result += this.diceSize.toString();
          i++;
          continue;
        }
      }
      else if (current === "%") {
        // 单独处理%符号 -> 转换为d100
        if (i === 0 || !/\d/.test(processed[i - 1])) {
          result += "1d100";
        }
        else {
          result += "d100";
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
        this.tokens.push({
          type,
          value: char,
          position,
        });
        position++;
        continue;
      }

      throw new Error(`无法识别的字符: ${char} (位置: ${position})`);
    }

    // 添加结束标记
    this.tokens.push({
      type: "operator",
      value: "#",
      position: expr.length,
    });
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

    const exprObj = this.evaluateExpression();

    return {
      result: exprObj.value,
      expanded: this.consecutiveDiceDetected ? "[略]" : exprObj.detailed,
    };
  }

  /**
   * 计算表达式值（使用双栈算法）
   * @returns 表达式值对象
   */
  private evaluateExpression(): ExpressionValue {
    const values: ExpressionValue[] = [];
    const ops: string[] = [];

    while (this.currentIndex < this.tokens.length) {
      const token = this.tokens[this.currentIndex++];

      // 处理数字：创建简单表达式对象
      if (token.type === "number") {
        const num = token.value as number;
        const exprStr = num.toString();
        values.push({
          value: num,
          expr: exprStr,
          detailed: exprStr,
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

        // 处理括号内的表达式
        const lastValue = values[values.length - 1];
        if (lastValue) {
          lastValue.expr = `(${lastValue.expr})`;
          lastValue.detailed = `(${lastValue.detailed})`;
        }
        continue;
      }

      // 处理运算符
      const currentOp = token.value as string;

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
   * @param values ֵջ
   * @param op 运算符
   */
  private applyOp(values: ExpressionValue[], op: string): void {
    if (op === "#")
      return;

    // 特殊处理d操作符
    if (op === "d") {
      // 确保有足够的操作数，不足时使用默认值
      const b = values.pop() || this.createDefaultDiceSide();
      const a = values.pop() || this.createDefaultDiceCount();

      // 验证参数
      const count = a.value <= 0 ? 1 : a.value;
      const sides = b.value <= 0 ? this.diceSize : b.value;

      // 掷骰子
      const { total, rolls } = this.rollDice(count, sides);
      const diceDetails = `[${rolls.join("+")}]`;

      // 创建表达式对象
      const exprStr = `${a.expr}d${b.expr}`;
      const detailedStr = `${a.detailed}d${b.detailed}${diceDetails}`;

      // 检查连续骰子操作
      if (a.isDice) {
        this.consecutiveDiceDetected = true;
      }

      values.push({
        value: total,
        expr: exprStr,
        detailed: detailedStr,
        isDice: true,
      });
      return;
    }

    // 确保有足够的操作数
    if (values.length < 2) {
      throw new Error(`运算符 ${op} 缺少操作数`);
    }

    const b = values.pop()!;
    const a = values.pop()!;

    // 计算结果
    let value: number;
    switch (op) {
      case "+":
        value = a.value + b.value;
        break;
      case "-":
        value = a.value - b.value;
        break;
      case "*":
        value = a.value * b.value;
        break;
      case "/":
        if (b.value === 0)
          throw new Error("除零错误");
        value = Math.round(a.value / b.value);
        break;
      default: throw new Error(`未知运算符: ${op}`);
    }

    // 创建表达式对象
    const exprStr = `${a.expr}${op}${b.expr}`;
    const detailedStr = `${a.detailed}${op}${b.detailed}`;

    values.push({
      value,
      expr: exprStr,
      detailed: detailedStr,
      isDice: a.isDice || b.isDice,
    });
  }

  /**
   * 创建默认骰子数量表达式
   */
  private createDefaultDiceCount(): ExpressionValue {
    return {
      value: 1,
      expr: "1",
      detailed: "1",
      isDice: false,
    };
  }

  /**
   * 创建默认骰子面数表达式
   */
  private createDefaultDiceSide(): ExpressionValue {
    return {
      value: this.diceSize,
      expr: this.diceSize.toString(),
      detailed: this.diceSize.toString(),
      isDice: false,
    };
  }

  /**
   * 模拟掷骰子
   * @param count 骰子数量
   * @param sides 骰子面数
   * @returns 总点数和每个骰子的点数
   */
  private rollDice(count: number, sides: number): { total: number; rolls: number[] } {
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

      if (token.type === "number") {
        const num = token.value as number;
        minValues.push(num);
        maxValues.push(num);
        continue;
      }

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

      const op = token.value as string;
      while (
        ops.length > 0
        && this.precedence[ops[ops.length - 1]] >= this.precedence[op]
      ) {
        this.applyRangeOp(minValues, maxValues, ops.pop()!);
      }

      ops.push(op);
    }

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
        minValues.push(aMin);
        maxValues.push(aMax * bMax);
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
 * roll("1d10+2d6") // { result: 12, expanded: "1d10[7]+2d6[2+3]" }
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
function range(dice: string, diceSize: number = 100): { min: number; max: number } {
  const parser = new ExpressionParser(diceSize);
  return parser.range(dice);
}

/**
 * 掷一个指定面数的骰子
 * @param {number} [diceSize] - 骰子的面数，默认为100面骰
 * @returns {number} 返回1到diceSize之间的随机整数
 * @example
 * rollDice(6) // 返回1-6之间的随机数
 * rollDice()  // 返回1-100之间的随机数
 */
export function rollDice(diceSize: number = 100): number {
  return Math.floor(Math.random() * diceSize) + 1;
}

/**
 * 解析骰子表达式并返回结果和可能范围
 * @param {string} expr - 骰子表达式字符串
 * @param {number} diceSize - 骰子的面数，默认为100面骰
 * @returns {object} 包含结果和范围的对象
 * @property {object} result - 解析结果
 * @property {number} result.value - 表达式计算结果
 * @property {string} result.expanded - 展开后的表达式细节
 * @property {object} possibleRange - 表达式可能的最小/最大值范围
 * @property {number} possibleRange.min - 表达式可能的最小值
 * @property {number} possibleRange.max - 表达式可能的最大值
 * @example
 * parseDiceExpression("2d6+3") // 返回类似:
 * // {
 * //   result: { value: 8, expanded: "2d6[1+5]+3" },
 * //   possibleRange: { min: 5, max: 15 }
 * // }
 */
export function parseDiceExpression(expr: string, diceSize: number = 100): {
  result: { value: number; expanded: string };
  possibleRange: { max: number; min: number };
} {
  const parser = new ExpressionParser(diceSize);
  const result = parser.parse(expr);
  const possibleRange = parser.range(expr);
  return { result: { value: result.result, expanded: result.expanded }, possibleRange };
}

