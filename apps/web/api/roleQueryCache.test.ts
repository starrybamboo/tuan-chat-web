import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  patchRoomRoleAvatarFieldsInListQueryCache,
  patchUserRoleAvatarFieldsInListQueryCache,
  upsertUserRoleListQueryCache,
} from "./roleQueryCache";

const makeRole = (overrides: Partial<UserRole>): UserRole => ({
  userId: 1,
  roleId: 1,
  roleName: "role",
  description: "",
  type: 0,
  extra: {},
  ...overrides,
});

describe("roleQueryCache", () => {
  it("upserts created roles into matching user role list caches only", () => {
    const queryClient = new QueryClient();
    const createdRole = makeRole({ roleId: 10, roleName: "created", type: 1 });
    const existingRole = makeRole({ roleId: 5, roleName: "existing", type: 1 });

    queryClient.setQueryData(["getUserRolesByType", 1, 1], [existingRole]);
    queryClient.setQueryData(["getUserRolesByType", 1, 0], [makeRole({ roleId: 3, type: 0 })]);
    queryClient.setQueryData(["getUserRolesByType", 2, 1], [makeRole({ userId: 2, roleId: 8, type: 1 })]);

    upsertUserRoleListQueryCache(queryClient, createdRole);

    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 1])?.map(role => role.roleId)).toEqual([10, 5]);
    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 1, 0])?.map(role => role.roleId)).toEqual([3]);
    expect(queryClient.getQueryData<UserRole[]>(["getUserRolesByType", 2, 1])?.map(role => role.roleId)).toEqual([8]);
  });

  it("新增角色时保留服务端分页总数和非末页状态", () => {
    const queryClient = new QueryClient();
    const queryKey = ["getUserRolesByType", 1, 0] as const;
    queryClient.setQueryData(queryKey, {
      success: true,
      data: {
        pageNo: 1,
        pageSize: 2,
        totalRecords: 40,
        isLast: false,
        list: [makeRole({ roleId: 7 }), makeRole({ roleId: 6 })],
      },
    });

    upsertUserRoleListQueryCache(queryClient, makeRole({ roleId: 8 }));

    expect(queryClient.getQueryData<any>(queryKey)?.data).toMatchObject({
      totalRecords: 41,
      isLast: false,
    });
  });

  it("更新无限分页角色时按服务端总数重新计算 isLast", () => {
    const queryClient = new QueryClient();
    const queryKey = ["getUserRolesByType", 1, 0, "infinite"] as const;
    queryClient.setQueryData(queryKey, {
      pageParams: [1, 2],
      pages: [
        { success: true, data: { pageNo: 1, pageSize: 2, totalRecords: 5, isLast: false, list: [makeRole({ roleId: 7 }), makeRole({ roleId: 6 })] } },
        { success: true, data: { pageNo: 2, pageSize: 2, totalRecords: 5, isLast: false, list: [makeRole({ roleId: 5 }), makeRole({ roleId: 4 })] } },
      ],
    });

    upsertUserRoleListQueryCache(queryClient, makeRole({ roleId: 8 }));

    const pages = queryClient.getQueryData<any>(queryKey)?.pages;
    expect(pages.map((page: any) => page.data.totalRecords)).toEqual([6, 6]);
    expect(pages.map((page: any) => page.data.isLast)).toEqual([false, false]);
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

});
