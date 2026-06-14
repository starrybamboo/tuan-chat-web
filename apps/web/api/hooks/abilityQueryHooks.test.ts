import { afterEach, describe, expect, it, vi } from "vitest";

const { abilityControllerMock } = vi.hoisted(() => ({
  abilityControllerMock: {
    getRoleAbilityByRule: vi.fn(),
    setRoleAbility: vi.fn(),
    updateRoleAbilityByRule: vi.fn(),
    updateRoleAbilityFieldByRule: vi.fn(),
  },
}));

vi.mock("../instance", () => ({
  tuanchat: {
    abilityController: abilityControllerMock,
  },
}));

import {
  loadRoleAbilityByRule,
  setRoleAbilityWithSuccessGuard,
  shouldRetryRoleAbilityByRule,
  updateRoleAbilityByRuleWithSuccessGuard,
  updateRoleAbilityFieldByRuleWithSuccessGuard,
} from "./abilityQueryHooks";

describe("abilityQueryHooks success guard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("按规则更新能力时，业务失败会抛出后端 errMsg", async () => {
    abilityControllerMock.updateRoleAbilityByRule.mockResolvedValueOnce({
      success: false,
      errMsg: "无权限",
      errCode: 101,
    });

    await expect(updateRoleAbilityByRuleWithSuccessGuard({
      roleId: 12,
      ruleId: 3,
      skill: { 侦查: "80" },
    })).rejects.toThrow("无权限");
  });

  it("创建能力和更新字段也会把 success:false 视为失败", async () => {
    abilityControllerMock.setRoleAbility.mockResolvedValueOnce({ success: false, errMsg: "创建被拒绝" });
    abilityControllerMock.updateRoleAbilityFieldByRule.mockResolvedValueOnce({ success: false });

    await expect(setRoleAbilityWithSuccessGuard({
      roleId: 12,
      ruleId: 3,
      act: {},
      basic: {},
      ability: {},
      skill: {},
    })).rejects.toThrow("创建被拒绝");

    await expect(updateRoleAbilityFieldByRuleWithSuccessGuard({
      roleId: 12,
      ruleId: 3,
      skillFields: { 侦查: null as unknown as string },
    })).rejects.toThrow("更新角色能力字段失败");
  });

  it("按规则获取能力时，未配置能力的成功空数据会作为空能力缓存", async () => {
    abilityControllerMock.getRoleAbilityByRule.mockResolvedValueOnce({
      success: true,
      data: null,
    });

    await expect(loadRoleAbilityByRule(15481, 1)).resolves.toBeNull();
  });

  it("按规则获取能力时，业务失败不会被降级成空能力", async () => {
    abilityControllerMock.getRoleAbilityByRule.mockResolvedValueOnce({
      success: false,
      errCode: 8003,
      errMsg: "能力不存在",
    });

    await expect(loadRoleAbilityByRule(15481, 1)).rejects.toThrow("能力不存在");
  });

  it("按规则获取能力时，4xx 请求错误不重试", () => {
    expect(shouldRetryRoleAbilityByRule(0, { status: 404 })).toBe(false);
    expect(shouldRetryRoleAbilityByRule(1, { status: 500 })).toBe(true);
    expect(shouldRetryRoleAbilityByRule(2, { status: 500 })).toBe(false);
  });
});
