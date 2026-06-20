import type { RoleAvatar, RoleAvatarVariant } from "../../../../api";

import {
  buildExpressionChooserAvatarCategoryGroups,
  buildExpressionChooserAvatarVariantGroups,
  EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID,
  getExpressionChooserAvatarVariantFolders,
  getExpressionChooserAvatarVariantId,
  resolveExpressionChooserActiveVariantId,
} from "./expressionChooserModel";

function variant(overrides: Partial<RoleAvatarVariant> = {}): RoleAvatarVariant {
  return {
    variantId: 100,
    name: "常服",
    baseAvatarId: 11,
    ...overrides,
  };
}

function avatar(overrides: Partial<RoleAvatar> = {}): RoleAvatar {
  return {
    roleId: 1,
    avatarId: 1,
    avatarTitle: { label: "默认" },
    category: "默认",
    ...overrides,
  };
}

describe("expressionChooserModel", () => {
  it("按立绘组独立建目录，未分组排在真实立绘组之后", () => {
    const groups = buildExpressionChooserAvatarVariantGroups([
      avatar({ avatarId: 1 }),
      avatar({ avatarId: 12, variantId: 200, variantGroup: variant({ variantId: 200, name: "战损" }) }),
      avatar({ avatarId: 11, variantId: 100, variantGroup: variant() }),
      avatar({ avatarId: 13, variantId: 100, variantGroup: variant() }),
    ]);

    expect(groups.map(group => ({
      variantId: group.variantId,
      label: group.label,
      count: group.avatars.length,
    }))).toEqual([
      { variantId: 100, label: "常服", count: 2 },
      { variantId: 200, label: "战损", count: 1 },
      { variantId: EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID, label: "未分组", count: 1 },
    ]);
  });

  it("立绘组文件夹只包含真实立绘组，不把未分组当文件夹", () => {
    const groups = buildExpressionChooserAvatarVariantGroups([
      avatar({ avatarId: 1 }),
      avatar({ avatarId: 11, variantId: 100, variantGroup: variant() }),
    ]);

    expect(getExpressionChooserAvatarVariantFolders(groups).map(group => group.variantId)).toEqual([100]);
  });

  it("优先使用 variantGroup.variantId，缺失时回退到 avatar.variantId", () => {
    expect(getExpressionChooserAvatarVariantId(
      avatar({ variantId: 200, variantGroup: variant({ variantId: 100 }) }),
    )).toBe(100);
    expect(getExpressionChooserAvatarVariantId(avatar({ variantId: 200 }))).toBe(200);
    expect(getExpressionChooserAvatarVariantId(avatar())).toBe(EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID);
  });

  it("解析当前打开目录时优先保留已记住的角色立绘组", () => {
    const groups = buildExpressionChooserAvatarVariantGroups([
      avatar({ avatarId: 11, variantId: 100, variantGroup: variant() }),
      avatar({ avatarId: 21, variantId: 200, variantGroup: variant({ variantId: 200, name: "便服" }) }),
    ]);

    expect(resolveExpressionChooserActiveVariantId({
      groups,
      preferredVariantId: 200,
      selectedAvatarId: 11,
    })).toBe(200);
  });

  it("记住的立绘组失效后回退到当前头像所在组", () => {
    const groups = buildExpressionChooserAvatarVariantGroups([
      avatar({ avatarId: 11, variantId: 100, variantGroup: variant() }),
      avatar({ avatarId: 21, variantId: 200, variantGroup: variant({ variantId: 200, name: "便服" }) }),
    ]);

    expect(resolveExpressionChooserActiveVariantId({
      groups,
      preferredVariantId: 999,
      selectedAvatarId: 21,
    })).toBe(200);
  });

  it("显式返回未分组时不会被当前头像所在立绘组覆盖", () => {
    const groups = buildExpressionChooserAvatarVariantGroups([
      avatar({ avatarId: 11, variantId: 100, variantGroup: variant() }),
      avatar({ avatarId: 21, variantId: 200, variantGroup: variant({ variantId: 200, name: "便服" }) }),
    ]);

    expect(resolveExpressionChooserActiveVariantId({
      groups,
      preferredVariantId: EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID,
      selectedAvatarId: 21,
    })).toBe(EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID);
  });

  it("组内仍按头像 category 做二级分组", () => {
    const categories = buildExpressionChooserAvatarCategoryGroups([
      avatar({ avatarId: 1, category: "愤怒" }),
      avatar({ avatarId: 2, category: "" }),
      avatar({ avatarId: 3, category: "开心" }),
    ]);

    expect(categories.map(group => ({
      category: group.category,
      avatarIds: group.avatars.map(item => item.avatarId),
    }))).toEqual([
      { category: "默认", avatarIds: [2] },
      { category: "愤怒", avatarIds: [1] },
      { category: "开心", avatarIds: [3] },
    ]);
  });
});
