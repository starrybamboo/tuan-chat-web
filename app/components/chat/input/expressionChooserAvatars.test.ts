import { describe, expect, it } from "vitest";

import type { RoleAvatar, UserRole } from "../../../../api";

import { resolveExpressionChooserRoleAvatars } from "./expressionChooserAvatars";

type ExpressionChooserRoleAvatarSource = Pick<UserRole, "roleId" | "avatarId" | "avatarFileId">;

describe("resolveExpressionChooserRoleAvatars", () => {
  it("头像接口为空但角色已有默认头像时，会补一个回退头像项", () => {
    const selectedRole: ExpressionChooserRoleAvatarSource = {
      roleId: 12,
      avatarId: 34,
      avatarFileId: 56,
    };

    expect(resolveExpressionChooserRoleAvatars([], selectedRole)).toEqual([
      expect.objectContaining({
        avatarId: 34,
        roleId: 12,
        avatarFileId: 56,
        category: "默认",
      }),
    ]);
  });

  it("接口已有头像列表时，不会再注入回退头像", () => {
    const avatars: RoleAvatar[] = [{
      avatarId: 88,
      roleId: 12,
      category: "默认",
    }];
    const selectedRole: ExpressionChooserRoleAvatarSource = {
      roleId: 12,
      avatarId: 34,
    };

    expect(resolveExpressionChooserRoleAvatars(avatars, selectedRole)).toEqual(avatars);
  });

  it("角色没有头像时，保持空列表", () => {
    const selectedRole: ExpressionChooserRoleAvatarSource = {
      roleId: 12,
      avatarId: 0,
    };

    expect(resolveExpressionChooserRoleAvatars([], selectedRole)).toEqual([]);
  });
});
