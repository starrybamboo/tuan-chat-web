import { describe, expect, it } from "vitest";
import { normalizeRoleAbilityCacheData } from "./roleAbilityCacheData";

describe("normalizeRoleAbilityCacheData", () => {
  it("同时保留房间状态运行时字段和角色详情字段别名", () => {
    const normalized = normalizeRoleAbilityCacheData(
      {
        abilityId: 10078,
        roleId: 14993,
        ruleId: 1,
        act: { 性别: "女" },
        basic: { 力量: "50", 体质: "50" },
        ability: { hp: "13", san: "40" },
        skill: { 侦查: "25" },
        extra: {
          copywriting: JSON.stringify({ 成功: ["不错"] }),
        },
      },
      { roleId: 14993, ruleId: 1 },
    );

    expect(normalized?.basic).toEqual({ 力量: "50", 体质: "50" });
    expect(normalized?.basicDefault).toEqual({ 力量: "50", 体质: "50" });
    expect(normalized?.ability).toEqual({ hp: "13", san: "40" });
    expect(normalized?.abilityDefault).toEqual({ hp: "13", san: "40" });
    expect(normalized?.skill).toEqual({ 侦查: "25" });
    expect(normalized?.skillDefault).toEqual({ 侦查: "25" });
    expect(normalized?.act).toEqual({ 性别: "女" });
    expect(normalized?.actTemplate).toEqual({ 性别: "女" });
    expect(normalized?.extraCopywriting).toEqual({ 成功: ["不错"] });
  });

  it("兼容已经带详情页别名的缓存数据", () => {
    const normalized = normalizeRoleAbilityCacheData(
      {
        basicDefault: { 力量: "60" },
        abilityDefault: { hp: "14" },
        skillDefault: { 图书馆: "75" },
        actTemplate: { 姓名: "青" },
        extraCopywriting: { 失败: ["还差一点"] },
      },
      { roleId: 14993, ruleId: 1 },
    );

    expect(normalized?.basic).toEqual({ 力量: "60" });
    expect(normalized?.basicDefault).toEqual({ 力量: "60" });
    expect(normalized?.ability).toEqual({ hp: "14" });
    expect(normalized?.skill).toEqual({ 图书馆: "75" });
    expect(normalized?.act).toEqual({ 姓名: "青" });
    expect(normalized?.extraCopywriting).toEqual({ 失败: ["还差一点"] });
  });

  it("空响应保持为 null", () => {
    expect(normalizeRoleAbilityCacheData(null, { roleId: 1, ruleId: 1 })).toBeNull();
  });
});
