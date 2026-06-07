import { describe, expect, it } from "vitest";

import { getDisplayRoleName } from "./roleDisplayName";

describe("getDisplayRoleName", () => {
  it("默认把 roleId=0 显示为未选择角色，保留输入区语义", () => {
    expect(getDisplayRoleName({ roleId: 0 })).toBe("未选择角色");
  });

  it("消息渲染可把 roleId=0 作为旁白处理，不显示未选择角色", () => {
    expect(getDisplayRoleName({ roleId: 0, zeroRoleIsNarrator: true })).toBe("");
  });

  it("旁白消息带自定义显示名时优先显示自定义名", () => {
    expect(getDisplayRoleName({
      roleId: 0,
      customRoleName: "广播",
      zeroRoleIsNarrator: true,
    })).toBe("广播");
  });
});
