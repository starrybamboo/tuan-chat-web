class ArithmeticExpressionParser {
  private index = 0;

  constructor(private readonly input: string) {}

  parse(): number | null {
    try {
      const value = this.parseExpression();
      this.skipWhitespace();
      return this.index === this.input.length && Number.isFinite(value) ? value : null;
    }
    catch {
      return null;
    }
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      this.skipWhitespace();
      if (this.match("+")) {
        value += this.parseTerm();
        continue;
      }
      if (this.match("-")) {
        value -= this.parseTerm();
        continue;
      }
      return value;
    }
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (true) {
      this.skipWhitespace();
      if (this.match("*")) {
        value *= this.parseFactor();
        continue;
      }
      if (this.match("/")) {
        const divisor = this.parseFactor();
        if (divisor === 0) {
          throw new Error("division by zero");
        }
        value /= divisor;
        continue;
      }
      return value;
    }
  }

  private parseFactor(): number {
    this.skipWhitespace();
    if (this.match("+")) {
      return this.parseFactor();
    }
    if (this.match("-")) {
      return -this.parseFactor();
    }
    if (this.match("(")) {
      const value = this.parseExpression();
      if (!this.match(")")) {
        throw new Error("missing closing parenthesis");
      }
      return value;
    }
    return this.parseNumber();
  }

  private parseNumber(): number {
    this.skipWhitespace();
    const start = this.index;
    let dotCount = 0;
    while (this.index < this.input.length) {
      const char = this.input[this.index];
      if (char === ".") {
        dotCount += 1;
        if (dotCount > 1) {
          throw new Error("invalid number");
        }
        this.index += 1;
        continue;
      }
      if (!/\d/.test(char)) {
        break;
      }
      this.index += 1;
    }

    const raw = this.input.slice(start, this.index);
    if (!/^\d+(?:\.\d+)?$|^\.\d+$/.test(raw)) {
      throw new Error("invalid number");
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new Error("invalid number");
    }
    return value;
  }

  private match(token: string): boolean {
    this.skipWhitespace();
    if (!this.input.startsWith(token, this.index)) {
      return false;
    }
    this.index += token.length;
    return true;
  }

  private skipWhitespace(): void {
    while (this.index < this.input.length && /\s/.test(this.input[this.index])) {
      this.index += 1;
    }
  }
}

export function evaluateWwDicePoolExpression(expression: string): number | null {
  const trimmed = expression.trim();
  if (!trimmed) {
    return null;
  }
  return new ArithmeticExpressionParser(trimmed).parse();
}
