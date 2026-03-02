import { describe, expect, it } from "vitest";

import { formatWwResultMessage, parseWwCommandArgs, rollWw } from "./cmdExeWw";

function createSequenceRng(sequence: number[]): () => number {
  let index = 0;
  return () => {
    const value = sequence[Math.min(index, sequence.length - 1)];
    index += 1;
    return value;
  };
}

describe("cmdExeWw", () => {
  describe("parseWwCommandArgs", () => {
    it("空参数时使用默认值", () => {
      expect(parseWwCommandArgs([])).toEqual({
        diceCount: 1,
        explodeAt: 10,
        bonusSuccess: 0,
        successAt: 8,
        sides: 10,
      });
    });

    it("支持完整参数 3a9+2", () => {
      expect(parseWwCommandArgs(["3a9+2"])).toEqual({
        diceCount: 3,
        explodeAt: 9,
        bonusSuccess: 2,
        successAt: 8,
        sides: 10,
      });
    });

    it("支持新格式参数 10a5k7m9", () => {
      expect(parseWwCommandArgs(["10a5k7m9"])).toEqual({
        diceCount: 10,
        explodeAt: 5,
        bonusSuccess: 0,
        successAt: 7,
        sides: 9,
      });
    });

    it("支持省略骰子个数与加骰参数（.ww +1）", () => {
      expect(parseWwCommandArgs(["+1"])).toEqual({
        diceCount: 1,
        explodeAt: 10,
        bonusSuccess: 1,
        successAt: 8,
        sides: 10,
      });
    });

    it("支持只给骰子个数（.ww 4）", () => {
      expect(parseWwCommandArgs(["4"])).toEqual({
        diceCount: 4,
        explodeAt: 10,
        bonusSuccess: 0,
        successAt: 8,
        sides: 10,
      });
    });

    it("支持全角符号", () => {
      expect(parseWwCommandArgs(["2ａ8＋3"])).toEqual({
        diceCount: 2,
        explodeAt: 8,
        bonusSuccess: 3,
        successAt: 8,
        sides: 10,
      });
    });
  });

  describe("rollWw (mocked)", () => {
    it("按阈值连锁加骰并统计成功数", () => {
      // 这里的 RNG 0.95 -> 10 (rollD10: floor(0.95*10)+1 = 10)
      // 0.75 -> 8
      // 0.99 -> 10
      // 0.01 -> 1
      // options: 2a10
      // Round 1 (2 dice):
      //   Dice 1: 0.95 -> 10 (Explode)
      //   Dice 2: 0.75 -> 8
      // Round 2 (1 dice from Dice 1):
      //   Dice 3: 0.99 -> 10 (Explode)
      // Round 3 (1 dice from Dice 3):
      //   Dice 4: 0.01 -> 1
      // Total: 10, 8, 10, 1.
      // Successes (>=8): 10, 8, 10 -> 3 successes.
      
      const options = { diceCount: 2, explodeAt: 10, bonusSuccess: 2, successAt: 8, sides: 10 };
      const rng = createSequenceRng([0.95, 0.75, 0.99, 0.01]); 

      const result = rollWw(options, rng);

      expect(result.rolls).toEqual([10, 8, 10, 1]);
      expect(result.rounds).toEqual([[10, 8], [10], [1]]);
      expect(result.baseSuccesses).toBe(3);
      expect(result.totalSuccesses).toBe(5);
    });

     it("达到上限时停止避免无限加骰", () => {
      const options = { diceCount: 1, explodeAt: 5, bonusSuccess: 0, successAt: 8, sides: 10 };
      const rng = () => 0.99; // 永远掷出10

      // rollWw 不再抛错，而是截断
      const result = rollWw(options, rng, 20);
      expect(result.rolls.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe("formatWwResultMessage", () => {
    it("输出包含核心统计信息", () => {
      const options = { diceCount: 2, explodeAt: 9, bonusSuccess: 1, successAt: 8, sides: 10 };
      const result = { 
        rolls: [9, 10, 4, 8], 
        rounds: [[9, 10], [4, 8]],
        baseSuccesses: 3, 
        totalSuccesses: 4,
        totalRollsCount: 4
      };

      const msg = formatWwResultMessage(options, result, "TestRole");

      // <TestRole>掷出了 2a9+1=4
      // [2a9k8m10+1=成功4/4 轮数:2
      // 第 1 轮: {<9*>,<10*>}
      // 第 2 轮: {4,<8*>}
      // ]=4
      
      // 检查关键部分是否存在
      expect(msg).toContain("TestRole");
      expect(msg).toContain("2a9+1=4"); // 简化头部
      expect(msg).toContain("2a9k8m10+1=成功4/4"); // 详情头部
      expect(msg).toContain("第 1 轮: {<9*>,<10*>}");
      expect(msg).toContain("第 2 轮: {4,<8*>}");
    });
  });
});
