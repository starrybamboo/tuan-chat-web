import { describe, expect, it } from "vitest";

import type { StAbilityDraft } from "./stImportParser";

import { applyStCommandToDraft } from "./stImportParser";

const ST_TEST_DATA = `.st 力量50str50敏捷50dex50意志40pow40体质50con50外貌80app80教育80edu80体型80siz80智力50灵感50int50san40san值40理智40理智值40幸运45运气45mp8魔法8hp13体力13会计5人类学1估价5考古学1魅惑15攀爬20计算机5计算机使用5电脑5信用10信誉10信用评级10克苏鲁0克苏鲁神话0cm0乔装5闪避25汽车20驾驶20汽车驾驶20电气维修10电子学1话术80斗殴60手枪20急救45历史5恐吓15跳跃20法语60母语80法律60图书馆75图书馆使用75聆听80开锁1撬锁1锁匠1机械维修10医学1博物学10自然学10领航10导航10神秘学5重型操作1重型机械1操作重型机械1重型1说服10精神分析1心理学66骑术5药学1妙手10侦查25潜行20生存10游泳20投掷20追踪10驯兽5潜水1爆破1读唇1催眠1炮术10`;

function createTemplateKeys() {
  return {
    basic: new Set(["体型", "体质", "力量", "外貌", "幸运", "意志", "敏捷", "教育", "智力"]),
    ability: new Set(["hp", "mp", "sanֵ", "护甲"]),
    skill: new Set([
      "会计",
      "估价",
      "计算机使用",
      "信用评级",
      "乔装",
      "闪避",
      "汽车驾驶",
      "斗殴",
      "手枪",
      "急救",
      "历史",
      "母语",
      "法律",
      "图书馆使用",
      "聆听",
      "锁匠",
      "医学",
      "导航",
      "操作重型机械",
      "心理学",
      "妙手",
      "侦查",
      "潜行",
      "生存",
      "游泳",
      "投掷",
      "追踪",
      "潜水",
      "爆破",
      "炮术",
    ]),
  };
}

describe("stImportParser", () => {
  it("应正确解析用户提供的长指令并保持 hp 在 ability 分组", () => {
    const draft: StAbilityDraft = {
      abilityId: 100,
      act: {},
      basic: {},
      // 模拟历史污染：体质/侦查曾被错误放在能力里
      ability: { hp: "0", 体质: "1", 侦查: "2" },
      skill: {},
    };

    const result = applyStCommandToDraft({
      cmd: ST_TEST_DATA,
      draft,
      templateKeys: createTemplateKeys(),
    });

    expect(result.draft.ability.hp).toBe("13");
    expect(result.draft.ability.体力).toBeUndefined();
    expect(result.draft.basic.力量).toBe("50");
    expect(result.draft.basic.体质).toBe("50");
    expect(result.draft.skill.母语).toBe("80");
    expect(result.draft.skill.侦查).toBe("25");

    // 别名归一
    expect(result.draft.skill.计算机使用).toBe("5");
    expect(result.draft.skill.信用评级).toBe("10");
    expect(result.draft.skill.汽车驾驶).toBe("20");

    // 旧污染能力键应进入删除列表
    expect(result.abilityFieldsToDelete.has("体质")).toBe(true);
    expect(result.abilityFieldsToDelete.has("侦查")).toBe(true);
  });
});
