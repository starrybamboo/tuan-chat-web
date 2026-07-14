import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  beginRoleAbilityOptimisticMutation,
  assertSuccessfulAbilityApiResult,
  fetchRoleAbilitiesByRule,
  fetchRoleAbilitiesByRuleWithCache,
  readSuccessfulAbilityApiResultData,
  roleAbilitiesBatchByRuleQueryKey,
  roleAbilityByRuleQueryKey,
  roleAbilityListQueryKey,
  rollbackRoleAbilityOptimisticMutation,
} from "./role-abilities";

describe("role-abilities success guard", () => {
  it("业务失败时抛出后端错误信息", () => {
    expect(() => assertSuccessfulAbilityApiResult({
      success: false,
      errMsg: "无权限",
    }, "更新角色能力失败")).toThrow("无权限");
  });

  it("缺少 errMsg 时使用调用方兜底文案", () => {
    expect(() => assertSuccessfulAbilityApiResult({
      success: false,
    }, "更新角色能力失败")).toThrow("更新角色能力失败");
  });

  it("查询能力时只把成功响应的 null data 当成空态", () => {
    expect(readSuccessfulAbilityApiResultData({
      success: true,
      data: null,
    }, "获取角色能力失败")).toBeNull();

    expect(() => readSuccessfulAbilityApiResultData({
      success: false,
      errMsg: "能力不存在",
      data: null,
    }, "获取角色能力失败")).toThrow("能力不存在");
  });

  it("批量读取多个角色能力时只发起一次请求", async () => {
    const batchGetByRuleAndRoles = vi.fn().mockResolvedValue({
      success: true,
      data: { 11: { roleId: 11, ruleId: 3 }, 12: { roleId: 12, ruleId: 3 } },
    });
    const getRoleAbilityByRule = vi.fn();
    const client = { abilityController: { batchGetByRuleAndRoles, getRoleAbilityByRule } } as any;

    await expect(fetchRoleAbilitiesByRule(client, [11, 12], 3)).resolves.toEqual({
      11: { roleId: 11, ruleId: 3 },
      12: { roleId: 12, ruleId: 3 },
    });
    expect(batchGetByRuleAndRoles).toHaveBeenCalledOnce();
    expect(batchGetByRuleAndRoles).toHaveBeenCalledWith({ roleIds: [11, 12], ruleId: 3 });
    expect(getRoleAbilityByRule).not.toHaveBeenCalled();
  });

  it("批量读取时复用新鲜的单角色缓存并回填缺失缓存", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(roleAbilityByRuleQueryKey(11, 3), { roleId: 11, ruleId: 3 });
    const batchGetByRuleAndRoles = vi.fn().mockResolvedValue({
      success: true,
      data: { 12: { roleId: 12, ruleId: 3 } },
    });
    const client = { abilityController: { batchGetByRuleAndRoles } } as any;

    const result = await fetchRoleAbilitiesByRuleWithCache(client, queryClient, [12, 11, 12], 3);

    expect(batchGetByRuleAndRoles).toHaveBeenCalledOnce();
    expect(batchGetByRuleAndRoles).toHaveBeenCalledWith({ roleIds: [12], ruleId: 3 });
    expect(result.get(11)).toEqual({ roleId: 11, ruleId: 3 });
    expect(result.get(12)).toEqual({ roleId: 12, ruleId: 3 });
    expect(queryClient.getQueryData(roleAbilityByRuleQueryKey(12, 3))).toEqual({ roleId: 12, ruleId: 3 });
  });

  it("提交局部能力更新时立即合并所有缓存视图并支持回滚", async () => {
    const queryClient = new QueryClient();
    const original = {
      abilityId: 101,
      roleId: 11,
      ruleId: 3,
      basic: { 力量: "50", 敏捷: "60" },
      ability: { hp: "12", san: "45" },
    };
    const batchQueryKey = [...roleAbilitiesBatchByRuleQueryKey(3), 11, 12];
    queryClient.setQueryData(roleAbilityByRuleQueryKey(11, 3), original);
    queryClient.setQueryData(roleAbilityListQueryKey(11), [original]);
    queryClient.setQueryData(batchQueryKey, { 11: original });

    const transaction = await beginRoleAbilityOptimisticMutation(queryClient, "update", {
      roleId: 11,
      ruleId: 3,
      basic: { 力量: "70" },
      ability: {},
    });

    expect(queryClient.getQueryData<any>(roleAbilityByRuleQueryKey(11, 3))?.basic).toEqual({
      力量: "70",
      敏捷: "60",
    });
    expect(queryClient.getQueryData<any[]>(roleAbilityListQueryKey(11))?.[0]?.ability).toEqual({
      hp: "12",
      san: "45",
    });
    expect(queryClient.getQueryData<any>(batchQueryKey)?.[11]?.basic?.力量).toBe("70");

    rollbackRoleAbilityOptimisticMutation(queryClient, transaction);
    expect(queryClient.getQueryData(roleAbilityByRuleQueryKey(11, 3))).toEqual(original);
    expect(queryClient.getQueryData<any[]>(roleAbilityListQueryKey(11))?.[0]).toEqual(original);
    expect(queryClient.getQueryData<any>(batchQueryKey)?.[11]).toEqual(original);
  });

  it("字段更新即时重命名和删除，并忽略服务端不会处理的缺失键", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(roleAbilityByRuleQueryKey(11, 3), {
      roleId: 11,
      ruleId: 3,
      skill: { 侦查: "60", 聆听: "45" },
    });

    await beginRoleAbilityOptimisticMutation(queryClient, "field", {
      roleId: 11,
      ruleId: 3,
      skillFields: {
        侦查: "观察",
        聆听: null as unknown as string,
        不存在: "新字段",
      },
    });

    expect(queryClient.getQueryData<any>(roleAbilityByRuleQueryKey(11, 3))?.skill).toEqual({
      观察: "60",
    });
  });

  it("创建能力时生成临时单条缓存，回滚后移除", async () => {
    const queryClient = new QueryClient();

    const transaction = await beginRoleAbilityOptimisticMutation(queryClient, "set", {
      roleId: 11,
      ruleId: 3,
      basic: { 力量: "50" },
    });

    expect(queryClient.getQueryData(roleAbilityByRuleQueryKey(11, 3))).toEqual({
      roleId: 11,
      ruleId: 3,
      basic: { 力量: "50" },
    });
    rollbackRoleAbilityOptimisticMutation(queryClient, transaction);
    expect(queryClient.getQueryData(roleAbilityByRuleQueryKey(11, 3))).toBeUndefined();
  });
});
