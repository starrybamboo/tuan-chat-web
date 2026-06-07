import { afterEach, describe, expect, it, vi } from "vitest";

const { abilityControllerMock } = vi.hoisted(() => ({
  abilityControllerMock: {
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
  setRoleAbilityWithSuccessGuard,
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
});
