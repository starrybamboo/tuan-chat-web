import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import {
  optimisticRemoveUserRolesFromListQueryCache,
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
});
