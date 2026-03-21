import { describe, expect, it } from "vitest";

import { resolveCurrentRoomRoleId } from "./useRoomRoleState";

describe("resolveCurrentRoomRoleId", () => {
  it("观战时即使残留旧角色选择，也强制回到无角色", () => {
    expect(resolveCurrentRoomRoleId({
      storedRoleId: 123,
      fallbackRoleId: 456,
      isSpaceOwner: false,
      isSpectator: true,
    })).toBe(-1);
  });

  it("普通玩家残留旁白/无角色选择时，回退到自己的默认角色", () => {
    expect(resolveCurrentRoomRoleId({
      storedRoleId: -1,
      fallbackRoleId: 456,
      isSpaceOwner: false,
      isSpectator: false,
    })).toBe(456);
  });

  it("主持人保留旁白选择", () => {
    expect(resolveCurrentRoomRoleId({
      storedRoleId: -1,
      fallbackRoleId: -1,
      availableRoleIds: new Set([456]),
      isSpaceOwner: true,
      isSpectator: false,
    })).toBe(-1);
  });

  it("当前角色已被删或移出房间时，立即回退到可用角色", () => {
    expect(resolveCurrentRoomRoleId({
      storedRoleId: 123,
      fallbackRoleId: 456,
      availableRoleIds: new Set([456, 789]),
      isSpaceOwner: false,
      isSpectator: false,
    })).toBe(456);
  });
});
