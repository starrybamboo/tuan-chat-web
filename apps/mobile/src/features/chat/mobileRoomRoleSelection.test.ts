import { describe, expect, it } from "vitest";

import { resolveMobileRoomRoleSelection } from "./mobileRoomRoleSelectionState";

describe("resolveMobileRoomRoleSelection", () => {
  it("主持人重进房间时保留已保存的角色身份", () => {
    expect(resolveMobileRoomRoleSelection({
      canSelectNarrator: true,
      canValidateRoleId: true,
      fallbackRoleId: 3,
      isSpectator: false,
      roles: [{ avatarFileId: 90, avatarId: 9, roleId: 7 }],
      snapshot: { avatarFileId: 120, avatarId: 12, roleId: 7 },
    })).toEqual({
      avatarFileId: 120,
      avatarId: 12,
      roleId: 7,
    });
  });

  it("角色列表未加载完成前不把已保存正角色降级成旁白", () => {
    expect(resolveMobileRoomRoleSelection({
      canSelectNarrator: true,
      canValidateRoleId: false,
      fallbackRoleId: undefined,
      isSpectator: false,
      roles: [],
      snapshot: { roleId: 7 },
    })).toEqual({ roleId: 7 });
  });

  it("普通成员遇到残留旁白选择时回退到可用角色", () => {
    expect(resolveMobileRoomRoleSelection({
      canSelectNarrator: false,
      canValidateRoleId: true,
      fallbackRoleId: 3,
      isSpectator: false,
      roles: [{ roleId: 3 }],
      snapshot: { roleId: -1 },
    })).toEqual({ roleId: 3 });
  });
});
