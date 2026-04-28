import { describe, expect, it, vi } from "vitest";

import {
  invalidateRoleAbilityCaches,
  roleAbilityByRuleQueryKey,
  roleAbilityListQueryKey,
} from "./abilityMutationInvalidation";
import {
  getCachedDicerRoleAbility,
  invalidateDicerRoleAbilityCache,
  setCachedDicerRoleAbility,
} from "../../app/components/common/dicer/roleAbilityCache";

function createQueryClientMock() {
  return {
    invalidateQueries: vi.fn(),
  };
}

describe("abilityMutationInvalidation", () => {
  it("统一生成角色能力查询 key", () => {
    expect(roleAbilityListQueryKey(12)).toEqual(["listRoleAbility", 12]);
    expect(roleAbilityListQueryKey()).toEqual(["listRoleAbility"]);
    expect(roleAbilityByRuleQueryKey(12, 3)).toEqual(["roleAbilityByRule", 12, 3]);
    expect(roleAbilityByRuleQueryKey(12)).toEqual(["roleAbilityByRule", 12]);
    expect(roleAbilityByRuleQueryKey()).toEqual(["roleAbilityByRule"]);
  });

  it("按 roleId/ruleId 同时失效 React Query 和骰点能力缓存", async () => {
    invalidateDicerRoleAbilityCache();
    setCachedDicerRoleAbility(3, 12, { skill: { 侦查: "80" } });
    setCachedDicerRoleAbility(3, 13, { skill: { 侦查: "20" } });
    const queryClient = createQueryClientMock();

    await invalidateRoleAbilityCaches(queryClient, { roleId: 12, ruleId: 3 });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["listRoleAbility", 12] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roleAbilityByRule", 12, 3] });
    expect(getCachedDicerRoleAbility(3, 12)).toBeNull();
    expect(getCachedDicerRoleAbility(3, 13)?.skill).toEqual({ 侦查: "20" });
  });

  it("缺少定位信息时执行全量角色能力失效", async () => {
    const queryClient = createQueryClientMock();

    await invalidateRoleAbilityCaches(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["listRoleAbility"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roleAbilityByRule"] });
  });
});
