import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import {
  patchRoomRoleAvatarFieldsInListQueryCache,
  optimisticRemoveUserRolesFromListQueryCache,
  patchUserRoleAvatarFieldsInListQueryCache,
  rollbackUserRoleListQueryCache,
  upsertUserRoleListQueryCache,
} from "./roleQueryCache";

const makeRole = (overrides: Partial<UserRole>): UserRole => ({
  userId: 1,
  roleId: 1,
  roleName: "role",
  description: "",
  type: 0,
  diceMaiden: false,
  extra: {},
  ...overrides,
});

describe("roleQueryCache", () => {
  it("upserts created roles into matching user role list caches only", () => {
    const queryClient = new QueryClient();
    const createdRole = makeRole({ roleId: 10, roleName: "created", type: 1, diceMaiden: true });
    const existingRole = makeRole({ roleId: 5, roleName: "existing", type: 1, diceMaiden: true });

    queryClient.setQueryData(["getUserRolesByType", 1, 1], [existingRole]);
    queryClient.setQueryData(["getUserRolesByType", 1, 0], [makeRole({ roleId: 3, type: 0 })]);
    queryClient.setQueryData(["getUserRolesByType", 2, 1], [makeRole({ userId: 2, roleId: 8, type: 1 })]);

    upsertUserRoleListQueryCache(queryClient, createdRole);

    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 1])?.map(role => role.roleId)).toEqual([10, 5]);
    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 0])?.map(role => role.roleId)).toEqual([3]);
    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 2, 1])?.map(role => role.roleId)).toEqual([8]);
  });

  it("optimistically removes roles from list caches and rolls back snapshots", async () => {
    const queryClient = new QueryClient();
    const roles = [
      makeRole({ roleId: 7, roleName: "delete me" }),
      makeRole({ roleId: 6, roleName: "keep me" }),
    ];
    const infiniteData = {
      pageParams: [{ pageNo: 1, pageSize: 15 }],
      pages: [
        {
          success: true,
          data: {
            pageNo: 1,
            pageSize: 15,
            totalRecords: 2,
            isLast: true,
            list: roles,
          },
        },
      ],
    };

    queryClient.setQueryData(["getUserRolesByType", 1, 0], roles);
    queryClient.setQueryData(["roleInfiniteByType", 1, 0], infiniteData);

    const snapshots = await optimisticRemoveUserRolesFromListQueryCache(queryClient, [7]);

    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 0])?.map(role => role.roleId)).toEqual([6]);
    expect(queryClient.getQueryData<any>(["roleInfiniteByType", 1, 0])?.pages[0].data.list.map((role: UserRole) => role.roleId)).toEqual([6]);

    rollbackUserRoleListQueryCache(queryClient, snapshots);

    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 0])?.map(role => role.roleId)).toEqual([7, 6]);
    expect(queryClient.getQueryData<any>(["roleInfiniteByType", 1, 0])?.pages[0].data.list.map((role: UserRole) => role.roleId)).toEqual([7, 6]);
  });

  it("会把头像字段补写到匹配的角色列表缓存中", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getUserRolesByType", 1, 0], [
      makeRole({ roleId: 7, avatarId: 55, avatarFileId: 1001 }),
    ]);

    patchUserRoleAvatarFieldsInListQueryCache(queryClient, {
      roleId: 7,
      avatarId: 55,
      avatarFileId: 2002,
      avatarMediaType: "image",
    });

    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 0])).toEqual([
      expect.objectContaining({
        roleId: 7,
        avatarId: 55,
        avatarFileId: 2002,
        avatarUrl: "https://media.tuan.chat/media/v1/files/002/2002/image/medium.webp",
        avatarThumbUrl: "https://media.tuan.chat/media/v1/files/002/2002/image/low.webp",
      }),
    ]);
  });

  it("头像字段补丁优先使用 fileId，不被旧 avatarUrl 覆盖", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getUserRolesByType", 1, 0], [
      {
        ...makeRole({ roleId: 7, avatarId: 55, avatarFileId: 1001 }),
        avatarUrl: "https://legacy.example/avatar.webp",
        avatarThumbUrl: "https://legacy.example/avatar-low.webp",
      },
    ]);

    patchUserRoleAvatarFieldsInListQueryCache(queryClient, {
      roleId: 7,
      avatarId: 55,
      avatarFileId: 2002,
      avatarMediaType: "image",
      avatarUrl: "https://legacy.example/next-avatar.webp",
      avatarThumbUrl: "https://legacy.example/next-avatar-low.webp",
    });

    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 0])).toEqual([
      expect.objectContaining({
        roleId: 7,
        avatarFileId: 2002,
        avatarUrl: "https://media.tuan.chat/media/v1/files/002/2002/image/medium.webp",
        avatarThumbUrl: "https://media.tuan.chat/media/v1/files/002/2002/image/low.webp",
      }),
    ]);
  });

  it("会把头像字段补写到房间角色缓存中", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["roomRole", 9], {
      success: true,
      data: [
        makeRole({ roleId: 7, avatarId: 55, avatarFileId: 1001 }),
      ],
    });

    patchRoomRoleAvatarFieldsInListQueryCache(queryClient, {
      roleId: 7,
      avatarId: 55,
      avatarFileId: 3003,
      avatarMediaType: "image",
    });

    expect(queryClient.getQueryData<any>(["roomRole", 9])).toMatchObject({
      data: [
        expect.objectContaining({
          roleId: 7,
          avatarFileId: 3003,
          avatarUrl: "https://media.tuan.chat/media/v1/files/003/3003/image/medium.webp",
          avatarThumbUrl: "https://media.tuan.chat/media/v1/files/003/3003/image/low.webp",
        }),
      ],
    });
  });

  it("头像字段补丁不会把不完整角色插入列表缓存", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getUserRolesByType", 1, 0], [
      makeRole({ roleId: 8, avatarId: 66, avatarFileId: 1001 }),
    ]);

    patchUserRoleAvatarFieldsInListQueryCache(queryClient, {
      roleId: 7,
      avatarId: 55,
      avatarFileId: 2002,
    });

    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 0])?.map(role => role.roleId)).toEqual([8]);
  });
});

