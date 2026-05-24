import { describe, expect, it } from "vitest";

import { getDndInitiativeModifier, rollDndInitiative } from "./initiative";

describe("initiative ability extractor", () => {
  it("优先使用先攻字段作为 DND 先攻修正", () => {
    expect(getDndInitiativeModifier({
      ability: { 先攻: "4" },
      basic: { 敏捷: "18" },
      skill: {},
    })).toEqual({
      modifier: 4,
      modifierLabel: "先攻(4)",
    });
  });

  it("没有先攻字段时从敏捷计算调整值", () => {
    expect(rollDndInitiative({
      ability: {},
      basic: { Dexterity: "14" },
      skill: {},
    }, {
      random: () => 0,
    })).toMatchObject({
      formulaText: "1d20(1) + Dexterity调整值(2)",
      modifier: 2,
      roll: 1,
      total: 3,
    });
  });

  it("没有可用能力数据时按纯 D20 投掷", () => {
    expect(rollDndInitiative(null, {
      random: () => 0.95,
    })).toMatchObject({
      formulaText: "1d20(20)",
      modifier: 0,
      roll: 20,
      total: 20,
    });
  });
});
