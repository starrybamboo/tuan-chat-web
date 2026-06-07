import { describe, expect, it, vi } from "vitest";

import {
  invalidateRoleAbilityCaches,
  roleAbilityByRuleQueryKey,
  roleAbilityListQueryKey,
} from "./abilityMutationInvalidation";

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

  it("按 roleId/ruleId 同时失效角色能力查询缓存", async () => {
    const queryClient = createQueryClientMock();

    await invalidateRoleAbilityCaches(queryClient, { roleId: 12, ruleId: 3 });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["listRoleAbility", 12] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roleAbilityByRule", 12, 3] });
  });

  it("缺少定位信息时执行全量角色能力失效", async () => {
    const queryClient = createQueryClientMock();

    await invalidateRoleAbilityCaches(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["listRoleAbility"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roleAbilityByRule"] });
  });
});
