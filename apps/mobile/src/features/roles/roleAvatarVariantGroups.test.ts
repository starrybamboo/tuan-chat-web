import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";

import { describe, expect, it } from "vitest";

import {
  buildRoleAvatarCategoryGroups,
  buildRoleAvatarVariantGroups,
  getRoleAvatarVariantFolders,
  ROLE_AVATAR_UNGROUPED_VARIANT_ID,
  resolveActiveRoleAvatarVariantId,
} from "./roleAvatarVariantGroups";

function avatar(input: Partial<RoleAvatar>): RoleAvatar {
  return input as RoleAvatar;
}

describe("roleAvatarVariantGroups", () => {
  it("按立绘组分组，并把未分组放在最后", () => {
    const groups = buildRoleAvatarVariantGroups([
      avatar({ avatarId: 1, avatarFileId: 11, category: "默认" }),
      avatar({
        avatarId: 2,
        avatarFileId: 22,
        variantId: 20,
        variantGroup: { baseAvatarId: 3, name: "战斗", variantId: 20 },
      }),
      avatar({
        avatarId: 3,
        avatarFileId: 33,
        variantId: 20,
        variantGroup: { baseAvatarId: 3, name: "战斗", variantId: 20 },
      }),
      avatar({
        avatarId: 4,
        avatarFileId: 44,
        variantGroup: { name: "日常", variantId: 10 },
      }),
    ]);

    expect(groups.map(group => group.variantId)).toEqual([10, 20, ROLE_AVATAR_UNGROUPED_VARIANT_ID]);
    expect(groups[1]?.coverAvatar?.avatarId).toBe(3);
    expect(getRoleAvatarVariantFolders(groups).map(group => group.label)).toEqual(["日常", "战斗"]);
  });

  it("优先使用已持久化组，其次使用当前选中头像所在组", () => {
    const groups = buildRoleAvatarVariantGroups([
      avatar({ avatarId: 1 }),
      avatar({ avatarId: 2, variantId: 20, variantGroup: { name: "战斗", variantId: 20 } }),
      avatar({ avatarId: 3, variantId: 30, variantGroup: { name: "日常", variantId: 30 } }),
    ]);

    expect(resolveActiveRoleAvatarVariantId({
      groups,
      preferredVariantId: 0,
      selectedAvatarId: 2,
    })).toBe(0);
    expect(resolveActiveRoleAvatarVariantId({
      groups,
      preferredVariantId: 30,
      selectedAvatarId: 2,
    })).toBe(30);
    expect(resolveActiveRoleAvatarVariantId({
      groups,
      preferredVariantId: 999,
      selectedAvatarId: 2,
    })).toBe(20);
  });

  it("按分类分组并把默认分类放在最前", () => {
    expect(buildRoleAvatarCategoryGroups([
      avatar({ avatarId: 1, category: "B" }),
      avatar({ avatarId: 2 }),
      avatar({ avatarId: 3, category: "A" }),
    ]).map(group => group.category)).toEqual(["默认", "A", "B"]);
  });
});
