import { beforeAll, describe, expect, it } from "vitest";

import { initAliasMapOnce } from "../aliasRegistry";
import { buildStShowCardModel } from "./stShowCard";

describe("stShowCard", () => {
  beforeAll(() => {
    initAliasMapOnce();
  });

  it("整卡模式会过滤规则默认值、去重并合并主资源上限", () => {
    const model = buildStShowCardModel({
      ability: {
        ruleId: 1,
        basic: {
          力量: "60",
          敏捷: "50",
        },
        ability: {
          hp: "5",
          hpm: "10",
          db: "0",
        },
        skill: {
          图书馆: "50",
          图书馆使用: "50",
          闪避: "40",
        },
      },
      template: {
        basicDefault: {
          力量: "50",
        },
        abilityFormula: {
          db: "0",
        },
        skillDefault: {
          图书馆: "20",
          图书馆使用: "20",
        },
      },
    });

    expect(model.requestedMode).toBe(false);
    expect(model.hiddenDefaultCount).toBe(1);
    expect(model.entries).toEqual([
      { key: "力量", label: "力量", value: "60" },
      { key: "敏捷", label: "敏捷", value: "50" },
      { key: "hp", label: "HP", value: "5/10" },
      { key: "图书馆使用", label: "图书馆使用", value: "50" },
      { key: "闪避", label: "闪避", value: "40" },
    ]);
  });

  it("点名展示会保留请求顺序，并跳过默认值过滤", () => {
    const model = buildStShowCardModel({
      ability: {
        ruleId: 1,
        basic: {
          力量: "50",
        },
        ability: {
          hp: "5",
        },
      },
      template: {
        basicDefault: {
          力量: "50",
        },
      },
      requestedKeys: ["hp", "str", "力量"],
      keyAliasMap: {
        str: "力量",
      },
    });

    expect(model.requestedMode).toBe(true);
    expect(model.hiddenDefaultCount).toBe(0);
    expect(model.entries).toEqual([
      { key: "hp", label: "HP", value: "5" },
      { key: "力量", label: "力量", value: "50" },
    ]);
  });

  it("主资源上限键先出现时仍只展示合并结果，且不误算隐藏默认值", () => {
    const model = buildStShowCardModel({
      ability: {
        ability: {
          hpm: "10",
          hp: "7",
        },
      },
      template: {
        abilityFormula: {
          hpm: "10",
        },
      },
    });

    expect(model.requestedMode).toBe(false);
    expect(model.hiddenDefaultCount).toBe(0);
    expect(model.entries).toEqual([
      { key: "hp", label: "HP", value: "7/10" },
    ]);
  });
});
