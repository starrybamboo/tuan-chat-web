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
      });
    });

    it("支持完整参数 3a9+2", () => {
      expect(parseWwCommandArgs(["3a9+2"])).toEqual({
        diceCount: 3,
        explodeAt: 9,
        bonusSuccess: 2,
      });
    });

    it("支持省略骰子个数与加骰参数（.ww +1）", () => {
      expect(parseWwCommandArgs(["+1"])).toEqual({
        diceCount: 1,
        explodeAt: 10,
        bonusSuccess: 1,
      });
    });

    it("支持只给骰子个数（.ww 4）", () => {
      expect(parseWwCommandArgs(["4"])).toEqual({
        diceCount: 4,
        explodeAt: 10,
        bonusSuccess: 0,
      });
    });

    it("支持全角符号", () => {
      expect(parseWwCommandArgs(["2ａ8＋3"])).toEqual({
        diceCount: 2,
        explodeAt: 8,
        bonusSuccess: 3,
      });
    });

    it("加骰参数越界时报错", () => {
      expect(() => parseWwCommandArgs(["2a4"])).toThrow("加骰参数必须在 5-10 之间");
      expect(() => parseWwCommandArgs(["2a11"])).toThrow("加骰参数必须在 5-10 之间");
    });

    it("非法格式时报错", () => {
      expect(() => parseWwCommandArgs(["2a8a1"])).toThrow("只允许一个 a 分隔符");
      expect(() => parseWwCommandArgs(["1x2"])).toThrow("参数格式错误");
    });
  });

  describe("rollWw", () => {
    it("按阈值连锁加骰并统计成功数", () => {
      const options = { diceCount: 2, explodeAt: 10, bonusSuccess: 2 };
      const rng = createSequenceRng([0.95, 0.75, 0.99, 0.01]); // 10,8,10,1

      const result = rollWw(options, rng);

      expect(result.rolls).toEqual([10, 8, 10, 1]);
      expect(result.baseSuccesses).toBe(3);
      expect(result.totalSuccesses).toBe(5);
    });

    it("达到上限时抛错避免无限加骰", () => {
      const options = { diceCount: 1, explodeAt: 5, bonusSuccess: 0 };
      const rng = () => 0.99; // 永远掷出10，持续触发加骰

      expect(() => rollWw(options, rng, 20)).toThrow("加骰次数过多");
    });
  });

  describe("formatWwResultMessage", () => {
    it("输出包含核心统计信息", () => {
      const msg = formatWwResultMessage(
        { diceCount: 2, explodeAt: 9, bonusSuccess: 1 },
        { rolls: [9, 10, 4, 8], baseSuccesses: 3, totalSuccesses: 4 },
      );

      expect(msg).toContain("WW检定：2a9+1");
      expect(msg).toContain("骰面结果：[9, 10, 4, 8]");
      expect(msg).toContain("基础成功数（>=8）：3");
      expect(msg).toContain("最终成功数：4");
    });
  });
});
