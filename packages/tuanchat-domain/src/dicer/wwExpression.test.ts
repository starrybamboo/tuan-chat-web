import { describe, expect, it } from "vitest";

import { evaluateWwDicePoolExpression } from "./wwExpression";

describe("ww expression evaluator", () => {
  it("evaluates arithmetic with precedence and parentheses", () => {
    expect(evaluateWwDicePoolExpression("3+2*4")).toBe(11);
    expect(evaluateWwDicePoolExpression("(3+2)/2")).toBe(2.5);
    expect(evaluateWwDicePoolExpression("-1 + 5")).toBe(4);
  });

  it("rejects unsafe or invalid expressions", () => {
    expect(evaluateWwDicePoolExpression("1/0")).toBeNull();
    expect(evaluateWwDicePoolExpression("1..2")).toBeNull();
    expect(evaluateWwDicePoolExpression("globalThis.constructor")).toBeNull();
    expect(evaluateWwDicePoolExpression("1;return 99")).toBeNull();
  });
});
