import type { RoleAvatar } from "api";
import { describe, expect, it, vi } from "vitest";
import { hydrateRoleList, mergeRoleList } from "./roleListData";

function createQueryClientMock(cachedAvatar?: RoleAvatar) {
  const getQueryData = vi.fn(<T>() => (cachedAvatar ? ({ data: cachedAvatar } as T) : undefined));
  return {
    getQueryData,
    fetchQuery: vi.fn(),
  };
}

describe("roleListData", () => {
  it("会保留已有角色的本地字段，同时用最新列表覆盖基础资料", () => {
    const merged = mergeRoleList([
      {
        id: 10,
        name: "旧名字",
        description: "旧描述",
        avatarId: 99,
        avatar: "old-avatar",
        avatarThumb: "old-thumb",
        basic: { hp: "12" },
      },
    ], [
      {
        id: 10,
        name: "新名字",
        description: "新描述",
        avatarId: 99,
        avatar: "",
        avatarThumb: "",
      },
    ]);

    expect(merged).toEqual([
      expect.objectContaining({
        id: 10,
        name: "新名字",
        description: "新描述",
        avatar: "old-avatar",
        avatarThumb: "old-thumb",
        basic: { hp: "12" },
      }),
    ]);
  });

  it("能在没有侧边栏参与的情况下独立补齐角色头像", async () => {
    const cachedAvatar: RoleAvatar = {
      avatarId: 55,
      avatarUrl: "https://example.com/avatar.png",
      avatarThumbUrl: "https://example.com/avatar-thumb.png",
    };
    const queryClient = createQueryClientMock(cachedAvatar);
    const seedRoleAvatarQueryCaches = vi.fn();

    const roles = await hydrateRoleList({
      previousRoles: [],
      diceRoles: [],
      normalRoles: [
        {
          userId: 1,
          roleId: 7,
          roleName: "调查员",
          description: "desc",
          avatarId: 55,
          type: 0,
        },
      ],
      queryClient: queryClient as any,
      seedRoleAvatarQueryCaches,
      fetchRoleAvatar: vi.fn(),
    });

    expect(roles).toEqual([
      expect.objectContaining({
        id: 7,
        name: "调查员",
        avatar: "https://example.com/avatar.png",
        avatarThumb: "https://example.com/avatar-thumb.png",
      }),
    ]);
    expect(queryClient.getQueryData).toHaveBeenCalledWith(["getRoleAvatar", 55]);
    expect(seedRoleAvatarQueryCaches).not.toHaveBeenCalled();
  });
});
