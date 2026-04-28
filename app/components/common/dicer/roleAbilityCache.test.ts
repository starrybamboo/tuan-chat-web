import { describe, expect, it } from "vitest";

import {
  getCachedDicerRoleAbility,
  invalidateDicerRoleAbilityCache,
  setCachedDicerRoleAbility,
} from "./roleAbilityCache";

describe("roleAbilityCache", () => {
  it("按角色和规则精确清理骰点能力缓存", () => {
    invalidateDicerRoleAbilityCache();

    setCachedDicerRoleAbility(1, 10, { skill: { 手枪: "90" } });
    setCachedDicerRoleAbility(1, 11, { skill: { 手枪: "70" } });

    invalidateDicerRoleAbilityCache({ ruleId: 1, roleId: 10 });

    expect(getCachedDicerRoleAbility(1, 10)).toBeNull();
    expect(getCachedDicerRoleAbility(1, 11)?.skill).toEqual({ 手枪: "70" });
  });

  it("返回缓存副本，避免调用方直接污染缓存内容", () => {
    invalidateDicerRoleAbilityCache();

    setCachedDicerRoleAbility(2, 20, { skill: { 侦查: "60" } });
    const cached = getCachedDicerRoleAbility(2, 20);

    if (cached?.skill) {
      cached.skill.侦查 = "1";
    }

    expect(getCachedDicerRoleAbility(2, 20)?.skill).toEqual({ 侦查: "60" });
  });
});
