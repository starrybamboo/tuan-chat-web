import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deleteRoleAvatarsWithSuccessGuard,
  deleteRoleAvatarWithSuccessGuard,
  fetchRoleAvatarWithCache,
  roleAvatarQueryKey,
  seedRoleAvatarQueryCaches,
  userRolesByTypesQueryKey,
} from "./RoleAndAvatarHooks";

const { deleteRoleAvatarMock, getRoleAvatarMock } = vi.hoisted(() => ({
  deleteRoleAvatarMock: vi.fn(),
  getRoleAvatarMock: vi.fn(),
}));

vi.mock("../instance", () => ({
  tuanchat: {
    avatarController: {
      deleteRoleAvatar: deleteRoleAvatarMock,
      getRoleAvatar: getRoleAvatarMock,
    },
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe("role avatar cache helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("seedRoleAvatarQueryCaches 会保持 getRoleAvatar 的 ApiResult 形状", async () => {
    const queryClient = createQueryClient();

    seedRoleAvatarQueryCaches(queryClient, {
      avatarId: 123,
      roleId: 45,
      avatarFileId: 123,
    });

    expect(queryClient.getQueryData(roleAvatarQueryKey(123))).toMatchObject({
      success: true,
      data: {
        avatarId: 123,
        roleId: 45,
        avatarFileId: 123,
      },
    });

    await expect(fetchRoleAvatarWithCache(queryClient, 123)).resolves.toMatchObject({
      success: true,
      data: {
        avatarId: 123,
        roleId: 45,
      },
    });
    expect(getRoleAvatarMock).not.toHaveBeenCalled();
  });

  it("seedRoleAvatarQueryCaches 会在头像列表缓存不存在时创建 getRoleAvatars 列表", () => {
    const queryClient = createQueryClient();

    seedRoleAvatarQueryCaches(queryClient, {
      avatarId: 123,
      roleId: 45,
      avatarFileId: 123,
    }, 45);

    expect(queryClient.getQueryData(["getRoleAvatars", 45])).toMatchObject({
      success: true,
      data: [
        {
          avatarId: 123,
          roleId: 45,
          avatarFileId: 123,
        },
      ],
    });
  });

  it("deleteRoleAvatarWithSuccessGuard 在业务失败时会抛错", async () => {
    deleteRoleAvatarMock.mockResolvedValueOnce({ success: false, errMsg: "denied" });

    await expect(deleteRoleAvatarWithSuccessGuard(123)).rejects.toThrow("denied");
    expect(deleteRoleAvatarMock).toHaveBeenCalledWith(123);
  });

  it("deleteRoleAvatarsWithSuccessGuard 会把 success:false 计入批量失败", async () => {
    deleteRoleAvatarMock
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, errMsg: "denied" });

    await expect(deleteRoleAvatarsWithSuccessGuard([123, 456])).rejects.toThrow("批量删除失败：1 个头像删除失败");
    expect(deleteRoleAvatarMock).toHaveBeenCalledTimes(2);
  });

  it("userRolesByTypesQueryKey 不再复用全量 getUserRoles 缓存 key", () => {
    expect(userRolesByTypesQueryKey(7, [1, 0, 1, Number.NaN])).toEqual(["getUserRolesByTypes", 7, 0, 1]);
    expect(userRolesByTypesQueryKey(7, [0, 1])).not.toEqual(["getUserRoles", 7]);
  });
});
