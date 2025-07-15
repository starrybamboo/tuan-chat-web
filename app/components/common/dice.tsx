type PrecedenceTableType = Record<string, Record<string, string>>;

const PrecedenceTable: PrecedenceTableType = {
  "#": { "#": "=", "(": "<", "+": "<", "-": "<", ")": "!", "*": "<", "/": "<", "d": "<" },
  "+": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": "<", "/": "<", "d": "<" },
  "-": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": "<", "/": "<", "d": "<" },
  "(": { "#": "!", "(": "!", "+": "<", "-": "<", ")": "=", "*": "<", "/": "<", "d": "<" },
  ")": { "#": ">", "(": "!", "+": ">", "-": ">", ")": ">", "*": ">", "/": ">", "d": ">" },
  "*": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": ">", "/": ">", "d": "<" },
  "/": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": ">", "/": ">", "d": "<" },
  "d": { "#": ">", "(": "<", "+": ">", "-": ">", ")": ">", "*": ">", "/": ">", "d": ">" },
};

class Stack<T> {
  private data: T[];
  private top: number;

  constructor(size: number) {
    this.data = Array.from({ length: size });
    this.top = -1;
  }

  push(value: T): void {
    if (this.top === this.data.length - 1) {
      this.data.push(value);
    }
    else {
      this.data[this.top + 1] = value;
    }
    this.top++;
  }

  pop(): T | undefined {
    if (this.top === -1)
      return undefined;
    this.top--;
    return this.data[this.top + 1];
  }

  peek(): T | undefined {
    if (this.top === -1)
      return undefined;
    return this.data[this.top];
  }

  empty(): boolean {
    return this.top === -1;
  }

  size(): number {
    return this.top + 1;
  }
}

function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}

function isValidOperator(op: string): boolean {
  const validOps = ["+", "-", "*", "/", "d", "(", ")", "#"];
  return validOps.includes(op);
}

function isSpace(r: string): boolean {
  return r === " " || r === "\t" || r === "\n";
}

function isExprEnd(r: string): boolean {
  return r === ")" || r === "+" || r === "-" || r === "*" || r === "/" || r === "d";
}

function d(a: number, b: number, totalRolls: number): [number, number] {
  if (a <= 0)
    return [0, totalRolls];

  // 检查掷骰次数限制
  if (totalRolls + a > 100000000) {
    throw new Error("掷骰次数超过上限（100,000,000次）");
  }

  // 执行掷骰
  let sum = 0;
  for (let i = 0; i < a; i++) {
    sum += Math.floor(Math.random() * b) + 1;
  }

  return [sum, totalRolls + a];
}

function preprocessDiceExpr(expr: string, dice_size: number = 100): string {
  let processed = "";
  let i = 0;

  while (i < expr.length) {
    const current = expr[i];

    if (current === "d") {
      // 检查是否是d%的情况
      if (i + 1 < expr.length && expr[i + 1] === "%") {
        processed += "d100";
        i += 2; // 跳过d和%
        continue;
      }
      // ===== 左侧检查 =====
      let leftHasDigit = false;
      let leftIsExprEnd = false;

      if (i > 0) {
        // 向左跳过空格
        let leftIndex = i - 1;
        while (leftIndex >= 0 && isSpace(expr[leftIndex])) {
          leftIndex--;
        }

        if (leftIndex >= 0) {
          const leftChar = expr[leftIndex];
          if (isDigit(leftChar)) {
            leftHasDigit = true;
          }
          if (isExprEnd(leftChar)) {
            leftIsExprEnd = true;
          }
        }
      }

      // 添加默认次数
      if (!leftHasDigit && !leftIsExprEnd) {
        processed += "1";
      }
      processed += "d";

      // ===== 右侧检查 =====
      let rightHasValidContent = false;
      let rightIndex = i + 1;

      // 跳过空格
      while (rightIndex < expr.length && isSpace(expr[rightIndex])) {
        rightIndex++;
      }

      // 检查右侧有效内容
      if (rightIndex < expr.length) {
        const nextChar = expr[rightIndex];
        // 有效内容：数字或左括号
        if (isDigit(nextChar) || nextChar === "(") {
          rightHasValidContent = true;
        }
      }

      // 添加默认面数
      if (!rightHasValidContent) {
        processed += dice_size.toString();
      }
    }
    else {
      processed += current;
    }

    i++;
  }

  return processed;
}

function calculate(a: number, b: number, op: string, totalRolls: number): [number, number] {
  switch (op) {
    case "+": return [a + b, totalRolls];
    case "-": return [a - b, totalRolls];
    case "*": return [a * b, totalRolls];
    case "/":
      if (b === 0)
        throw new Error("除零错误");
      return [Math.floor(a / b), totalRolls];
    case "d":
      if (b <= 0)
        throw new Error("骰子面数必须为正数");
      return d(a, b, totalRolls);
    default:
      throw new Error(`未知运算符: ${op}`);
  }
}

function evaluate(diceExpr: string, diceSize: number = 100): number {
  let totalRolls = 0;

  try {
    diceExpr = `${preprocessDiceExpr(diceExpr, diceSize)}#`;

    const opnd = new Stack<number>(100); // 操作数栈
    const oprt = new Stack<string>(100); // 运算符栈
    oprt.push("#"); // 栈底标识

    let i = 0;

    while (i < diceExpr.length) {
      // 跳过空白字符
      if (isSpace(diceExpr[i])) {
        i++;
        continue;
      }

      // 处理数字
      if (isDigit(diceExpr[i])) {
        let num = 0;
        while (i < diceExpr.length && isDigit(diceExpr[i])) {
          num = num * 10 + Number.parseInt(diceExpr[i]);
          i++;
        }
        opnd.push(num);
        continue;
      }

      // 处理运算符
      let op = i < diceExpr.length ? diceExpr[i] : "#";

      // 检查字符合法性
      if (!isValidOperator(op)) {
        // 遇到非法字符，视为结束
        op = "#";
        i = diceExpr.length; // 跳过剩余字符
      }
      else {
        i++;
      }

      const topOp = oprt.peek() || "#";
      const precedence = PrecedenceTable[topOp]?.[op] || "!";

      switch (precedence) {
        case "<":
          oprt.push(op);
          break;

        case "=":
          oprt.pop();
          if (topOp === "#" && op === "#") {
            break;
          }
          break;

        case ">":
        { if (opnd.size() < 2) {
          throw new Error("缺少操作数");
        }

        const b = opnd.pop()!;
        const a = opnd.pop()!;
        const operator = oprt.pop()!;

        const [result, newRolls] = calculate(a, b, operator, totalRolls);
        totalRolls = newRolls;
        opnd.push(result);
        if (op !== "#") {
          i--; // 仅对非结束符回退
        }
        break; }

        case "!":
          throw new Error(`语法错误: 不支持的运算符组合 ${topOp} 和 ${op}`);
      }
    }

    if (opnd.size() !== 1) {
      throw new Error("表达式不完整");
    }

    return opnd.pop()!;
  }
  catch (error) {
    console.error(`骰子表达式求值错误: ${diceExpr}`, error);
    throw error;
  }
}

// 使用示例
// console.log(Evaluate("2d6+3"));                  // 正常骰子
// console.log(Evaluate("d"));                      // 默认1d100
// console.log(Evaluate("2*3+4"));                  // 纯算术
// console.log(Evaluate("(2d6+3)*4+(1d100-50)/2")); //含有多级括号的表达式

/**
 * 骰点表达式解析器
 * @param dice 骰点表达式
 * @returns 掷骰计算结果
 * @example
 * roll("2d6+4*5+d10+10") // 5*(2d6+4)+1d10+10
 */
export function roll(dice: string): number {
  return evaluate(dice);
}

/**
 * 骰子模拟器
 * @param n 骰子个数
 * @param x 骰子面数
 * @param k 倍数
 * @param p 修正1
 * @param c 修正2
 * @returns 掷骰计算结果
 * @example
 * //函数D(n,x,k,p,c)=(nDx+p)*k+c
 * D(2,6,5,4,10) // 5*(2d6+4)+10
 */
export function D(n: number, x: number, k: number = 1, p: number = 0, c: number = 0): number {
  return (roll(`${n}d${x}`) + p) * k + c;
}
