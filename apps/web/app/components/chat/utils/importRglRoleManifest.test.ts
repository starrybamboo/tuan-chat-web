import { describe, expect, it, vi } from "vitest";

import type { RoleAvatar } from "../../../../api";

import {
  applyReplayRoleAvatarImportPlan,
  buildReplayRoleAvatarImportPlanFromAssetManifest,
  buildReplayRoleAvatarSpriteTransform,
} from "./importRglRoleManifest";

const role = (roleId: number, roleName: string) => ({ roleId, roleName });
const avatar = (roleId: number, avatarId: number, label: string): RoleAvatar => ({
  roleId,
  avatarId,
  avatarTitle: { label },
});

describe("buildReplayRoleAvatarImportPlanFromAssetManifest", () => {
  it("把已上传 manifest 里的角色素材编译成创建和更新计划", () => {
    const plan = buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        丰聪耳神子: {
          avatars: {
            闭眼平静: {
              kind: "character-avatar-bust",
              fileId: 9001,
              width: 512,
              height: 512,
            },
            全身半睁静眼: {
              kind: "character-sprite",
              fileId: 9002,
              width: 900,
              height: 1600,
              visibleBounds: { x: 80, y: 10, width: 740, height: 1540 },
            },
          },
        },
      },
    }, {
      roles: [role(10, "丰聪耳神子")],
      avatarsByRoleId: {
        10: [avatar(10, 3001, "闭眼平静")],
      },
    });

    expect(plan.stats).toEqual({ roleCreate: 0, create: 1, update: 1 });
    expect(plan.entries).toMatchObject([
      {
        action: "update",
        existingAvatarId: 3001,
        avatarName: "闭眼平静",
        avatarRequest: {
          avatarId: 3001,
          roleId: 10,
          avatarTitle: { label: "闭眼平静" },
          avatarFileId: 9001,
          spriteFileId: 9001,
          originFileId: 9001,
        },
      },
      {
        action: "create",
        avatarName: "全身半睁静眼",
        createRequest: {
          roleId: 10,
          category: "gululu-replay",
        },
        avatarRequest: {
          roleId: 10,
          avatarTitle: { label: "全身半睁静眼" },
          avatarFileId: 9002,
          spriteFileId: 9002,
          originFileId: 9002,
        },
      },
    ]);
    expect(plan.entries[0]?.avatarRequest.spriteTransform)
      .not.toEqual(plan.entries[1]?.avatarRequest.spriteTransform);
  });

  it("按源图类型区分头像式、立绘式和漫画头像 transform", () => {
    const bustTransform = buildReplayRoleAvatarSpriteTransform({
      width: 512,
      height: 512,
    }, "character-avatar-bust");
    const spriteTransform = buildReplayRoleAvatarSpriteTransform({
      width: 900,
      height: 1600,
      visibleBounds: { x: 80, y: 10, width: 740, height: 1540 },
    }, "character-sprite");
    const mangaTransform = buildReplayRoleAvatarSpriteTransform({
      width: 1400,
      height: 700,
    }, "manga-avatar");

    expect(spriteTransform.scale).toBeGreaterThan(bustTransform.scale ?? 0);
    expect(spriteTransform.positionY).not.toBe(bustTransform.positionY);
    expect(mangaTransform.scale).toBeLessThanOrEqual(0.64);
    expect(mangaTransform.positionY).not.toBe(spriteTransform.positionY);
  });

  it("角色不存在时生成自动创建角色计划", () => {
    const plan = buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          description: "自动导入的烈。",
          avatars: {
            震惊: { kind: "character-avatar-bust", fileId: 1, width: 512, height: 512 },
          },
        },
      },
    }, {
      roles: [],
      avatarsByRoleId: {},
    });

    expect(plan.stats).toEqual({ roleCreate: 1, create: 1, update: 0 });
    expect(plan.rolesToCreate).toEqual([
      {
        description: "自动导入的烈。",
        roleName: "烈",
        tempRoleId: -1,
        type: 0,
      },
    ]);
    expect(plan.entries).toMatchObject([
      {
        action: "create",
        roleId: -1,
        roleName: "烈",
        avatarName: "震惊",
      },
    ]);
  });

  it("缺少 fileId 或尺寸时严格失败", () => {
    expect(() => buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: { kind: "character-avatar-bust", width: 512, height: 512 },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
    })).toThrow("角色素材缺少 fileId：烈.震惊");

    expect(() => buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: { kind: "character-avatar-bust", fileId: 1, width: 512 },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
    })).toThrow("角色素材缺少 width/height：烈.震惊");
  });

  it("显式覆盖头像、舞台图和源图 fileId 时必须是正数", () => {
    const plan = buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-chat",
              fileId: 9101,
              avatarFileId: 9102,
              spriteFileId: 9103,
              originFileId: 9104,
              width: 512,
              height: 512,
            },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
    });

    expect(plan.entries[0]?.avatarRequest).toMatchObject({
      avatarFileId: 9102,
      spriteFileId: 9103,
      originFileId: 9104,
    });

    expect(() => buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-chat",
              fileId: 9101,
              spriteFileId: 0,
              width: 512,
              height: 512,
            },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
    })).toThrow("角色素材 spriteFileId 必须是正数：烈.震惊");
  });

  it("hasAlpha 显式提供时必须是布尔值", () => {
    expect(() => buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-chat",
              fileId: 9101,
              width: 512,
              height: 512,
              hasAlpha: "true",
            },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
    })).toThrow("角色素材 hasAlpha 必须是布尔值：烈.震惊");
  });

  it("visibleBounds 缺字段或越界时严格失败", () => {
    expect(() => buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            立绘: {
              kind: "character-sprite",
              fileId: 1,
              width: 900,
              height: 1600,
              visibleBounds: "80,10,740,1540",
            },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
    })).toThrow("角色素材 visibleBounds 必须是对象：烈.立绘");

    expect(() => buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            立绘: {
              kind: "character-sprite",
              fileId: 1,
              width: 900,
              height: 1600,
              visibleBounds: { x: 80, y: 10, width: 740 },
            },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
    })).toThrow("角色素材 visibleBounds 缺少 x/y/width/height：烈.立绘");

    expect(() => buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            立绘: {
              kind: "character-sprite",
              fileId: 1,
              width: 900,
              height: 1600,
              visibleBounds: { x: 80, y: 10, width: 900, height: 1540 },
            },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
    })).toThrow("角色素材 visibleBounds 超出图片范围：烈.立绘");
  });
});

describe("applyReplayRoleAvatarImportPlan", () => {
  it("新差分先创建头像 ID，再写入文件、标题和 transform", async () => {
    const plan = buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-chat",
              fileId: 9101,
              width: 512,
              height: 512,
            },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {},
    });
    const setRoleAvatar = vi.fn().mockResolvedValue({ success: true, data: 8101 });
    const updateRoleAvatar = vi.fn().mockResolvedValue({ success: true, data: { avatarId: 8101 } });

    const result = await applyReplayRoleAvatarImportPlan(plan, {
      setRoleAvatar,
      updateRoleAvatar,
    });

    expect(setRoleAvatar).toHaveBeenCalledWith({ roleId: 10, category: "gululu-replay" });
    expect(updateRoleAvatar).toHaveBeenCalledWith(expect.objectContaining({
      avatarId: 8101,
      roleId: 10,
      avatarTitle: { label: "震惊" },
      avatarFileId: 9101,
      spriteFileId: 9101,
      originFileId: 9101,
    }));
    expect(result).toMatchObject({
      stats: { roleCreate: 0, create: 1, update: 0 },
      entries: [{
        action: "create",
        avatarId: 8101,
        roleId: 10,
        avatarName: "震惊",
      }],
    });
  });

  it("已有差分直接更新，不重新创建", async () => {
    const plan = buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-chat",
              fileId: 9101,
              width: 512,
              height: 512,
            },
          },
        },
      },
    }, {
      roles: [role(10, "烈")],
      avatarsByRoleId: {
        10: [avatar(10, 8101, "震惊")],
      },
    });
    const setRoleAvatar = vi.fn();
    const updateRoleAvatar = vi.fn().mockResolvedValue({ success: true, data: { avatarId: 8101 } });

    const result = await applyReplayRoleAvatarImportPlan(plan, {
      setRoleAvatar,
      updateRoleAvatar,
    });

    expect(setRoleAvatar).not.toHaveBeenCalled();
    expect(updateRoleAvatar).toHaveBeenCalledWith(expect.objectContaining({
      avatarId: 8101,
      roleId: 10,
      avatarTitle: { label: "震惊" },
    }));
    expect(result.stats).toEqual({ roleCreate: 0, create: 0, update: 1 });
  });

  it("缺失角色会先自动创建并加入当前房间，再导入角色素材", async () => {
    const plan = buildReplayRoleAvatarImportPlanFromAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-chat",
              fileId: 9101,
              width: 512,
              height: 512,
            },
            默认: {
              kind: "character-avatar-chat",
              fileId: 9102,
              width: 512,
              height: 512,
            },
          },
        },
      },
    }, {
      roles: [],
      avatarsByRoleId: {},
    });
    const createRole = vi.fn().mockResolvedValue({ success: true, data: 10 });
    const addRoomRole = vi.fn().mockResolvedValue({ success: true });
    const setRoleAvatar = vi.fn()
      .mockResolvedValueOnce({ success: true, data: 8101 })
      .mockResolvedValueOnce({ success: true, data: 8102 });
    const updateRoleAvatar = vi.fn().mockResolvedValue({ success: true, data: {} });
    const updateRole = vi.fn().mockResolvedValue({ success: true });

    const result = await applyReplayRoleAvatarImportPlan(plan, {
      roomId: 13027,
      createRole,
      addRoomRole,
      setRoleAvatar,
      updateRoleAvatar,
      updateRole,
    });

    expect(createRole).toHaveBeenCalledWith({
      roleName: "烈",
      description: "由 Replay 角色素材导入自动创建。",
      type: 0,
    });
    expect(addRoomRole).toHaveBeenCalledWith({
      roomId: 13027,
      roleIdList: [10],
      type: 0,
    });
    expect(setRoleAvatar).toHaveBeenNthCalledWith(1, { roleId: 10, category: "gululu-replay" });
    expect(setRoleAvatar).toHaveBeenNthCalledWith(2, { roleId: 10, category: "gululu-replay" });
    expect(updateRoleAvatar).toHaveBeenCalledWith(expect.objectContaining({
      avatarId: 8101,
      roleId: 10,
      avatarTitle: { label: "震惊" },
    }));
    expect(updateRole).toHaveBeenCalledWith({
      roleId: 10,
      avatarId: 8101,
    });
    expect(result).toMatchObject({
      rolesCreated: [{ roleId: 10, roleName: "烈" }],
      stats: { roleCreate: 1, create: 2, update: 0 },
      entries: [
        { roleId: 10, avatarId: 8101, avatarName: "震惊" },
        { roleId: 10, avatarId: 8102, avatarName: "默认" },
      ],
    });
  });
});
