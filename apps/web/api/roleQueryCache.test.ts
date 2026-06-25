import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import {
  optimisticPatchRoleAvatarTitleInListQueryCache,
  optimisticRemoveRoleAvatarsFromListQueryCache,
  patchRoomRoleAvatarFieldsInListQueryCache,
  optimisticRemoveUserRolesFromListQueryCache,
  patchUserRoleAvatarFieldsInListQueryCache,
  rollbackRoleAvatarListQueryCache,
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

const makeAvatar = (overrides: Partial<RoleAvatar>): RoleAvatar => ({
  roleId: 1,
  avatarId: 1,
  avatarFileId: 101,
  avatarTitle: { label: "avatar" },
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

    queryClient.setQueryData(["getUserRolesByType", 1, 0], roles);

    const snapshots = await optimisticRemoveUserRolesFromListQueryCache(queryClient, [7]);

    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 0])?.map(role => role.roleId)).toEqual([6]);

    rollbackUserRoleListQueryCache(queryClient, snapshots);

    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 0])?.map(role => role.roleId)).toEqual([7, 6]);
  });

  it("会把头像 fileId 字段补写到匹配的角色列表缓存中", () => {
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
        avatarMediaType: "image",
      }),
    ]);
  });

  it("会把头像 fileId 字段补写到房间角色缓存中", () => {
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
          avatarMediaType: "image",
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

  it("会乐观移除角色头像列表并可回滚 wrapped response", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getRoleAvatars", 7], {
      success: true,
      data: [
        makeAvatar({ avatarId: 11, avatarTitle: { label: "delete me" } }),
        makeAvatar({ avatarId: 12, avatarTitle: { label: "keep me" } }),
      ],
    });

    const snapshot = await optimisticRemoveRoleAvatarsFromListQueryCache(queryClient, 7, [11]);

    expect(queryClient.getQueryData<any>(["getRoleAvatars", 7])?.data.map((avatar: RoleAvatar) => avatar.avatarId)).toEqual([12]);

    rollbackRoleAvatarListQueryCache(queryClient, snapshot);

    expect(queryClient.getQueryData<any>(["getRoleAvatars", 7])?.data.map((avatar: RoleAvatar) => avatar.avatarId)).toEqual([11, 12]);
  });

  it("会乐观更新角色头像标题并可回滚数组缓存", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getRoleAvatars", 8], [
      makeAvatar({ avatarId: 21, avatarTitle: { label: "old" } }),
      makeAvatar({ avatarId: 22, avatarTitle: { label: "other" } }),
    ]);

    const snapshot = await optimisticPatchRoleAvatarTitleInListQueryCache(queryClient, 8, 21, "new");

    expect(queryClient.getQueryData<RoleAvatar[]>(["getRoleAvatars", 8])).toEqual([
      expect.objectContaining({ avatarId: 21, avatarTitle: { label: "new" } }),
      expect.objectContaining({ avatarId: 22, avatarTitle: { label: "other" } }),
    ]);

    rollbackRoleAvatarListQueryCache(queryClient, snapshot);

    expect(queryClient.getQueryData<RoleAvatar[]>(["getRoleAvatars", 8])).toEqual([
      expect.objectContaining({ avatarId: 21, avatarTitle: { label: "old" } }),
      expect.objectContaining({ avatarId: 22, avatarTitle: { label: "other" } }),
    ]);
  });
});
