import { describe, expect, it } from "vitest";

import {
  buildRoleAbilityFieldKeyPayload,
  buildRoleAbilitySectionUpdatePayload,
} from "./roleAbilityFieldPayload";

describe("roleAbilityFieldPayload", () => {
  it("改值和新增字段走 section merge payload", () => {
    expect(buildRoleAbilitySectionUpdatePayload(12, 3, "basic", { 力量: "50" })).toEqual({
      roleId: 12,
      ruleId: 3,
      basic: { 力量: "50" },
    });
  });

  it("重命名和删除 key 走 field key payload", () => {
    expect(buildRoleAbilityFieldKeyPayload(12, 3, "skill", {
      侦查: "侦察",
      临时: null,
    })).toEqual({
      roleId: 12,
      ruleId: 3,
      skillFields: {
        侦查: "侦察",
        临时: null,
      },
    });
  });
});
