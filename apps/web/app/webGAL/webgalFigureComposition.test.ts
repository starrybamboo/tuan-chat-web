import { describe, expect, it } from "vitest";

import type { RoleAvatar, RoleAvatarVariant } from "../../api";

import {
  buildWebgalFigureRenderAsset,
  resolveFigureCompositionCandidate,
  selectFigureGroupBase,
} from "./webgalFigureComposition";

function variantGroup(overrides: Partial<RoleAvatarVariant> = {}): RoleAvatarVariant {
  return {
    variantId: 100,
    roleId: 1,
    name: "校服",
    baseAvatarId: 10,
    compositionConfig: {
      canvas: { width: 1000, height: 1600 },
      avatarSlot: { x: 10, y: 20, width: 300, height: 300 },
      output: { format: "webp" },
    },
    ...overrides,
  };
}

function avatar(overrides: Partial<RoleAvatar>): RoleAvatar {
  const group = variantGroup(overrides.variantGroup);
  return {
    roleId: 1,
    avatarId: 1,
    variantId: group.variantId,
    variantGroup: group,
    avatarFileId: 3001,
    spriteFileId: 2001,
    avatarCropContext: {
      sourceWidth: 1000,
      sourceHeight: 1600,
      crop: { x: 10, y: 20, width: 300, height: 300 },
    },
    ...overrides,
  };
}

describe("webgalFigureComposition", () => {
  it("按 variantGroup.baseAvatarId 选择有 spriteFileId 的 base", () => {
    const group = variantGroup({ baseAvatarId: 10 });
    const avatars = [
      avatar({ avatarId: 12, category: "惊讶", spriteFileId: 4002, variantGroup: group }),
      avatar({ avatarId: 10, category: "开心", spriteFileId: 4001, variantGroup: group }),
      avatar({ avatarId: 8, variantId: 200, variantGroup: variantGroup({ variantId: 200, name: "便服", baseAvatarId: 8 }), spriteFileId: 4000 }),
      avatar({ avatarId: 6, spriteFileId: undefined, variantGroup: group }),
    ];

    const base = selectFigureGroupBase(avatars, group);

    expect(base?.avatarId).toBe(10);
  });

  it("缺少显式立绘组不参与合成，category 不作为分组键", () => {
    const current = avatar({ avatarId: 12, category: "黑化", variantId: undefined, variantGroup: undefined });
    const candidate = resolveFigureCompositionCandidate(current, [
      avatar({ avatarId: 10, category: "开心" }),
      current,
    ]);

    expect(candidate).toBeUndefined();
  });

  it("生成携带坐标的 compact composeFigure JSON 行", () => {
    const group = variantGroup({ baseAvatarId: 10 });
    const current = avatar({ avatarId: 12, avatarFileId: 3002, spriteFileId: undefined, variantGroup: group });
    const candidate = resolveFigureCompositionCandidate(current, [
      avatar({ avatarId: 10, spriteFileId: 2001, variantGroup: group }),
      current,
    ]);

    expect(candidate).toBeTruthy();
    const asset = buildWebgalFigureRenderAsset(candidate!, "role_1/base.webp", "role_1/avatar.webp");

    expect(asset.composite).toBe(true);
    expect(asset.composeLine).toContain(`composeFigure:${asset.target}`);
    expect(asset.composeLine).toContain(`"src":"role_1/base.webp"`);
    expect(asset.composeLine).toContain(`"src":"role_1/avatar.webp","x":10,"y":20,"width":300,"height":300`);
    expect(asset.composeLine).toContain("-width=1000 -height=1600 -format=webp;");
    expect(asset.stateKey).toContain("avatar:12:3002");
  });

  it("缺少 compositionConfig 时不会生成合成候选", () => {
    const candidate = resolveFigureCompositionCandidate(
      avatar({ avatarId: 12, variantGroup: variantGroup({ compositionConfig: undefined }) }),
      [avatar({ avatarId: 10 })],
    );

    expect(candidate).toBeUndefined();
  });
});
