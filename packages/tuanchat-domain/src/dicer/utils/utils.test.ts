import { describe, expect, it } from "vitest";

import UTILS from "./utils";

describe("dicer utils", () => {
  it("解析骰娘角色时角色绑定优先于空间默认骰娘", async () => {
    const resolved = await UTILS.getDicerRoleId(
      { curRoleId: 10, spaceId: 1 },
      {
        currentRoleSnapshot: { roleId: 10, extra: { dicerRoleId: 88 } },
        spaceSnapshot: { dicerRoleId: 2, extra: { dicerRoleId: 77 } },
      },
    );

    expect(resolved).toBe(88);
  });

  it("没有角色绑定时回退到空间骰娘", async () => {
    const resolved = await UTILS.getDicerRoleId(
      { curRoleId: 10, spaceId: 1 },
      {
        currentRoleSnapshot: { roleId: 10, extra: {} },
        spaceSnapshot: { dicerRoleId: 2, extra: { dicerRoleId: 77 } },
      },
    );

    expect(resolved).toBe(77);
  });
});
