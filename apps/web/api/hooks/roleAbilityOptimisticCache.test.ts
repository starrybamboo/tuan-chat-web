import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { roleAbilityByRuleQueryKey, roleAbilityListQueryKey } from "./abilityMutationInvalidation";
import { normalizeRoleAbilityCacheData } from "./roleAbilityCacheData";
import {
  beginWebRoleAbilityOptimisticMutation,
  rollbackWebRoleAbilityOptimisticMutation,
} from "./roleAbilityOptimisticCache";

function createCachedAbility() {
  return normalizeRoleAbilityCacheData({
    abilityId: 101,
    roleId: 11,
    ruleId: 3,
    basic: { 力量: "50", 敏捷: "60" },
    ability: { hp: "12", san: "45" },
    extra: { copywriting: JSON.stringify({ 成功: ["原文案"] }) },
  }, { roleId: 11, ruleId: 3 })!;
}

describe("roleAbilityOptimisticCache", () => {
  it("局部更新即时合并详情别名和列表缓存，失败时完整恢复", async () => {
    const queryClient = new QueryClient();
    const original = createCachedAbility();
    const originalList = { success: true, data: [original] };
    queryClient.setQueryData(roleAbilityByRuleQueryKey(11, 3), original);
    queryClient.setQueryData(roleAbilityListQueryKey(11), originalList);

    const transaction = await beginWebRoleAbilityOptimisticMutation(queryClient, "update", {
      roleId: 11,
      ruleId: 3,
      ability: { hp: "14" },
      extra: { copywriting: JSON.stringify({ 成功: ["新文案"] }) },
    });

    const optimistic = queryClient.getQueryData<any>(roleAbilityByRuleQueryKey(11, 3));
    expect(optimistic.ability).toEqual({ hp: "14", san: "45" });
    expect(optimistic.abilityDefault).toEqual({ hp: "14", san: "45" });
    expect(optimistic.extraCopywriting).toEqual({ 成功: ["新文案"] });
    expect(queryClient.getQueryData<any>(roleAbilityListQueryKey(11))?.data[0].ability).toEqual({
      hp: "14",
      san: "45",
    });

    rollbackWebRoleAbilityOptimisticMutation(queryClient, transaction);
    expect(queryClient.getQueryData(roleAbilityByRuleQueryKey(11, 3))).toEqual(original);
    expect(queryClient.getQueryData(roleAbilityListQueryKey(11))).toEqual(originalList);
  });

  it("字段重命名和删除同步刷新详情字段别名", async () => {
    const queryClient = new QueryClient();
    const original = normalizeRoleAbilityCacheData({
      roleId: 11,
      ruleId: 3,
      skill: { 侦查: "60", 聆听: "45" },
    }, { roleId: 11, ruleId: 3 });
    queryClient.setQueryData(roleAbilityByRuleQueryKey(11, 3), original);

    await beginWebRoleAbilityOptimisticMutation(queryClient, "field", {
      roleId: 11,
      ruleId: 3,
      skillFields: {
        侦查: "观察",
        聆听: null as unknown as string,
      },
    });

    const optimistic = queryClient.getQueryData<any>(roleAbilityByRuleQueryKey(11, 3));
    expect(optimistic.skill).toEqual({ 观察: "60" });
    expect(optimistic.skillDefault).toEqual({ 观察: "60" });
  });
});
