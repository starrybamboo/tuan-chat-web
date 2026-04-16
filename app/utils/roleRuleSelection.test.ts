import { describe, expect, it } from "vitest";

import {
  resolveRoleRuleSelection,
  shouldPersistRoleRuleSelection,
} from "./roleRuleSelection";

describe("roleRuleSelection", () => {
  it("空间规则存在时优先使用空间规则", () => {
    expect(resolveRoleRuleSelection({
      spaceRuleId: 7,
      storedRuleId: 3,
    })).toBe(7);
  });

  it("空间规则缺失时回退到已保存的角色规则", () => {
    expect(resolveRoleRuleSelection({
      spaceRuleId: undefined,
      storedRuleId: 5,
    })).toBe(5);
  });

  it("空间规则和本地缓存都不可用时回退到默认规则", () => {
    expect(resolveRoleRuleSelection({
      spaceRuleId: 0,
      storedRuleId: -1,
    })).toBe(1);
  });

  it("空间上下文内不应持久化角色规则缓存", () => {
    expect(shouldPersistRoleRuleSelection(9)).toBe(false);
  });

  it("非空间上下文内允许持久化角色规则缓存", () => {
    expect(shouldPersistRoleRuleSelection(undefined)).toBe(true);
    expect(shouldPersistRoleRuleSelection(0)).toBe(true);
  });
});
