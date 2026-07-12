import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  assertSuccessfulAbilityApiResult,
  fetchRoleAbilitiesByRule,
  fetchRoleAbilitiesByRuleWithCache,
  readSuccessfulAbilityApiResultData,
  roleAbilityByRuleQueryKey,
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
});
