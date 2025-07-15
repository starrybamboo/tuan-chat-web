class Stack<T> {
  private data: T[] = [];

  push(value: T): void {
    this.data.push(value);
  }

  pop(): T | null {
    return this.data.pop() || null;
  }

  peek(): T | null {
    return this.data.length ? this.data[this.data.length - 1] : null;
  }

  empty(): boolean {
    return this.data.length === 0;
  }

  size(): number {
    return this.data.length;
  }
}

const PrecedenceTable: Record<string, Record<string, string>> = {
  "#": { "#": "=", "(": "<", "+": "<", "-": "<", ")": "!", "*": "<", "/": "<", "d": "<" },
  "+": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": "<", "/": "<", "d": "<" },
  "-": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": "<", "/": "<", "d": "<" },
  "(": { "#": "!", "(": "!", "+": "<", "-": "<", ")": "=", "*": "<", "/": "<", "d": "<" },
  ")": { "#": ">", "(": "!", "+": ">", "-": ">", ")": ">", "*": ">", "/": ">", "d": ">" },
  "*": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": ">", "/": ">", "d": "<" },
  "/": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": ">", "/": ">", "d": "<" },
  "d": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": ">", "/": ">", "d": ">" },
};

const operatorMap: Record<string, string> = {
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

function isDigit(c: string): boolean {
  return /^\d$/.test(c);
}

function isValidOperator(op: string): boolean {
  return ["+", "-", "*", "/", "d", "(", ")", "#"].includes(op);
}

function isSpace(r: string): boolean {
  return r === " " || r === "\t" || r === "\n";
}

function isExprEnd(r: string): boolean {
  return [")", "+", "-", "*", "/", "d"].includes(r);
}

function rollDice(a: number, b: number, totalRolls: { value: number }): [number, number[]] | null {
  if (a <= 0)
    return [0, []];
  if (totalRolls.value + a > 100_000_000)
    throw new Error("掷骰次数超过上限（100,000,000次）");

  const rolls: number[] = [];
  let sum = 0;

  for (let i = 0; i < a; i++) {
    const roll = Math.floor(Math.random() * b) + 1;
    rolls.push(roll);
    sum += roll;
  }

  totalRolls.value += a;
  return [sum, rolls];
}

function preprocessDiceExpr(expr: string, diceSize: number): string {
  // 转换全角符号
  let processed = "";
  for (const char of expr) {
    processed += operatorMap[char] || char;
  }

  // 添加默认骰子参数
  let result = "";
  let i = 0;

  while (i < processed.length) {
    const current = processed[i];

    if (current === "d") {
      // 处理 d% 情况
      if (i + 1 < processed.length && processed[i + 1] === "%") {
        // 检查左侧是否需要添加默认值
        let leftIndex = i - 1;
        while (leftIndex >= 0 && isSpace(processed[leftIndex])) leftIndex--;

        const leftHasDigit = leftIndex >= 0 && isDigit(processed[leftIndex]);
        const leftIsExprEnd = leftIndex >= 0 && isExprEnd(processed[leftIndex]);

        if (!leftHasDigit && !leftIsExprEnd)
          result += "1";
        result += "d100";
        i += 2;
        continue;
      }

      // 普通 d 处理
      let leftIndex = i - 1;
      while (leftIndex >= 0 && isSpace(processed[leftIndex])) leftIndex--;

      const leftHasDigit = leftIndex >= 0 && isDigit(processed[leftIndex]);
      const leftIsExprEnd = leftIndex >= 0 && isExprEnd(processed[leftIndex]);

      if (!leftHasDigit && !leftIsExprEnd)
        result += "1";
      result += "d";

      // 处理右侧默认值
      let rightIndex = i + 1;
      while (rightIndex < processed.length && isSpace(processed[rightIndex])) rightIndex++;

      const rightHasValidContent
          = rightIndex < processed.length
            && (isDigit(processed[rightIndex]) || processed[rightIndex] === "(");

      if (!rightHasValidContent)
        result += diceSize.toString();
    }
    else {
      result += current;
    }
    i++;
  }

  return result;
}

function calculate(
  a: number,
  b: number,
  op: string,
  totalRolls: { value: number },
): [number, string] {
  switch (op) {
    case "+": return [a + b, ""];
    case "-": return [a - b, ""];
    case "*": return [a * b, ""];
    case "/":
      if (b === 0)
        throw new Error("除零错误");
      return [Math.floor(a / b), ""];
    case "d":
    { if (b <= 0)
      throw new Error("骰子面数必须为正数");
    const diceResult = rollDice(a, b, totalRolls);
    if (!diceResult)
      return [0, ""];
    const [sum, rolls] = diceResult;
    return [sum, `(${rolls.join("+")})`]; }
    default:
      throw new Error(`未知运算符: ${op}`);
  }
}

export function evaluate(
  diceExpr: string,
  diceSize: number = 100,
): { result: number; expanded: string } {
  const totalRolls = { value: 0 };
  const expr = `${preprocessDiceExpr(diceExpr, diceSize)}#`;
  let expanded = expr.slice(0, -1);

  const opnd = new Stack<number>();
  const oprt = new Stack<string>();
  oprt.push("#");

  const expandedParts: string[] = [];
  let i = 0;

  try {
    while (i < expr.length) {
      const char = expr[i];

      if (isSpace(char)) {
        i++;
        continue;
      }

      if (isDigit(char)) {
        let numStr = "";
        while (i < expr.length && isDigit(expr[i])) {
          numStr += expr[i++];
        }
        opnd.push(Number.parseInt(numStr, 10));
        continue;
      }

      const op = char;
      if (!isValidOperator(op)) {
        i = expr.length;
        continue;
      }
      i++;

      const topOp = oprt.peek();
      if (!topOp)
        throw new Error("运算符栈为空");

      const precedence = PrecedenceTable[topOp][op];
      if (!precedence)
        throw new Error(`无效的运算符组合: ${topOp} 和 ${op}`);

      switch (precedence) {
        case "<":
          oprt.push(op);
          break;
        case "=":
          oprt.pop();
          break;
        case ">":
        { const bVal = opnd.pop();
          const aVal = opnd.pop();
          const operator = oprt.pop();

          if (aVal === null || bVal === null || operator === null) {
            throw new Error("缺少操作数");
          }

          const [res, rollExpr] = calculate(aVal, bVal, operator, totalRolls);
          if (rollExpr)
            expandedParts.unshift(rollExpr);

          opnd.push(res);
          if (op !== "#")
            i--;
          break; }
        case "!":
          throw new Error(`语法错误: 不支持的运算符组合 ${topOp} 和 ${op}`);
      }
    }

    // 处理剩余操作
    while (oprt.size() > 1) {
      const bVal = opnd.pop();
      const aVal = opnd.pop();
      const operator = oprt.pop();

      if (aVal === null || bVal === null || operator === null) {
        throw new Error("表达式不完整");
      }

      const [res, rollExpr] = calculate(aVal, bVal, operator, totalRolls);
      if (rollExpr)
        expandedParts.unshift(rollExpr);
      opnd.push(res);
    }

    // 结果验证
    const finalResult = opnd.pop();
    if (
      opnd.size() !== 0
      || oprt.size() !== 1
      || oprt.peek() !== "#"
      || finalResult === null
    ) {
      throw new Error("表达式不完整");
    }

    // 构建展开表达式
    expanded = expanded.replace(/(\d*)d(\d+)/g, () => {
      return expandedParts.pop() || "$&";
    });

    return { result: finalResult, expanded };
  }
  catch (err) {
    throw new Error(`运行时错误: ${(err as Error).message}`);
  }
}

/**
 * 骰点表达式解析器
 * @param dice 骰点表达式
 * @returns 掷骰计算结果
 * @example
 * roll("2d6+4*5+d10+10") // 5*(2d6+4)+1d10+10
 */
export function roll(dice: string): { result: number; expanded: string } {
  return evaluate(dice);
}
