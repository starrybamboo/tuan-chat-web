import { describe, expect, it, vi } from "vitest";

import type { RoleAvatar } from "../../../../api";

import { applyUploadedReplayAssetManifest } from "./importRglAssetManifestApply";

const role = (roleId: number, roleName: string) => ({ roleId, roleName });
const avatar = (roleId: number, avatarId: number, label: string): RoleAvatar => ({
  roleId,
  avatarId,
  avatarTitle: { label },
});

describe("applyUploadedReplayAssetManifest", () => {
  it("角色素材缺少自动创建依赖时不写入通用素材包，避免部分导入", async () => {
    const createPackage = vi.fn();
    const updatePackage = vi.fn();
    const setRoleAvatar = vi.fn();
    const updateRoleAvatar = vi.fn();

    await expect(applyUploadedReplayAssetManifest({
      media: {
        backgrounds: {
          永远亭夜晚: { fileId: 9101 },
        },
      },
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-bust",
              fileId: 9001,
              width: 512,
              height: 512,
            },
          },
        },
      },
    }, {
      spaceId: 10788,
      loadRoleSources: () => ({
        roles: [],
        avatarsByRoleId: {},
      }),
      materialDeps: {
        findPackageByExactName: vi.fn().mockResolvedValue(null),
        createPackage,
        updatePackage,
      },
      roleDeps: {
        setRoleAvatar,
        updateRoleAvatar,
      },
    })).rejects.toThrow("角色素材导入需要 createRole 依赖");

    expect(createPackage).not.toHaveBeenCalled();
    expect(updatePackage).not.toHaveBeenCalled();
    expect(setRoleAvatar).not.toHaveBeenCalled();
    expect(updateRoleAvatar).not.toHaveBeenCalled();
  });

  it("含缺失角色和通用素材时，先创建角色并写头像，再写素材包", async () => {
    const calls: string[] = [];
    const createPackage = vi.fn().mockImplementation(async () => {
      calls.push("createPackage");
      return { success: true, data: { spacePackageId: 7001 } };
    });
    const createRole = vi.fn().mockImplementation(async () => {
      calls.push("createRole");
      return { success: true, data: 10 };
    });
    const addRoomRole = vi.fn().mockImplementation(async () => {
      calls.push("addRoomRole");
      return { success: true };
    });
    const setRoleAvatar = vi.fn().mockImplementation(async () => {
      calls.push("setRoleAvatar");
      return { success: true, data: 8101 };
    });
    const updateRoleAvatar = vi.fn().mockImplementation(async () => {
      calls.push("updateRoleAvatar");
      return { success: true, data: { avatarId: 8101 } };
    });
    const updateRole = vi.fn().mockImplementation(async () => {
      calls.push("updateRole");
      return { success: true };
    });

    const result = await applyUploadedReplayAssetManifest({
      media: {
        backgrounds: {
          永远亭夜晚: { fileId: 9101 },
        },
      },
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-bust",
              fileId: 9001,
              width: 512,
              height: 512,
            },
          },
        },
      },
    }, {
      spaceId: 10788,
      loadRoleSources: () => ({
        roles: [],
        avatarsByRoleId: {},
      }),
      materialDeps: {
        findPackageByExactName: vi.fn().mockResolvedValue(null),
        createPackage,
        updatePackage: vi.fn(),
      },
      roleDeps: {
        roomId: 13027,
        createRole,
        addRoomRole,
        setRoleAvatar,
        updateRoleAvatar,
        updateRole,
      },
    });

    expect(calls).toEqual([
      "createRole",
      "addRoomRole",
      "setRoleAvatar",
      "updateRoleAvatar",
      "updateRole",
      "createPackage",
    ]);
    expect(result.role?.stats).toEqual({ roleCreate: 1, create: 1, update: 0 });
    expect(result.material?.materialCount).toBe(1);
  });

  it("只有通用素材时不加载角色来源", async () => {
    const createPackage = vi.fn().mockResolvedValue({
      success: true,
      data: { spacePackageId: 7001 },
    });
    const loadRoleSources = vi.fn();

    const result = await applyUploadedReplayAssetManifest({
      media: {
        bgm: {
          战斗曲: { fileId: 9201 },
        },
      },
    }, {
      spaceId: 10788,
      loadRoleSources,
      materialDeps: {
        findPackageByExactName: vi.fn().mockResolvedValue(null),
        createPackage,
        updatePackage: vi.fn(),
      },
      roleDeps: {
        setRoleAvatar: vi.fn(),
        updateRoleAvatar: vi.fn(),
      },
    });

    expect(loadRoleSources).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      material: {
        action: "create",
        materialCount: 1,
        name: "Replay 导入素材",
        spacePackageId: 7001,
      },
    });
  });

  it("只有角色素材时创建并更新 RoleAvatar，不写入素材包", async () => {
    const createPackage = vi.fn();
    const setRoleAvatar = vi.fn().mockResolvedValue({ success: true, data: 8101 });
    const updateRoleAvatar = vi.fn().mockResolvedValue({ success: true, data: { avatarId: 8101 } });

    const result = await applyUploadedReplayAssetManifest({
      roles: {
        烈: {
          avatars: {
            震惊: {
              kind: "character-avatar-chat",
              fileId: 9001,
              width: 512,
              height: 512,
            },
            默认: {
              kind: "character-avatar-chat",
              fileId: 9002,
              width: 512,
              height: 512,
            },
          },
        },
      },
    }, {
      spaceId: 10788,
      loadRoleSources: () => ({
        roles: [role(10, "烈")],
        avatarsByRoleId: {
          10: [avatar(10, 3001, "默认")],
        },
      }),
      materialDeps: {
        findPackageByExactName: vi.fn(),
        createPackage,
        updatePackage: vi.fn(),
      },
      roleDeps: {
        setRoleAvatar,
        updateRoleAvatar,
      },
    });

    expect(createPackage).not.toHaveBeenCalled();
    expect(setRoleAvatar).toHaveBeenCalledTimes(1);
    expect(updateRoleAvatar).toHaveBeenCalledTimes(2);
    expect(result.role?.stats).toEqual({ roleCreate: 0, create: 1, update: 1 });
  });
});
