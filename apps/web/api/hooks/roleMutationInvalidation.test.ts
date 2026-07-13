import { describe, expect, it, vi } from "vitest";

import { invalidateRoleCreateQueries, invalidateUpdatedRoleQueries } from "./roleMutationInvalidation";

function createQueryClientMock() {
  return {
    invalidateQueries: vi.fn(),
  };
}

describe("invalidateRoleCreateQueries", () => {
  it("会刷新角色页侧边栏依赖的按类型角色查询", () => {
    const queryClient = createQueryClientMock();

    invalidateRoleCreateQueries(queryClient, undefined);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["getUserRolesByType"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["getUserRolesByTypes"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["clientMetadataBatch"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roleAvatarListsBatch"] });
  });

  it("创建空间角色后会失效空间角色相关缓存", () => {
    const queryClient = createQueryClientMock();

    invalidateRoleCreateQueries(queryClient, 99);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["spaceRole", 99] });
  });

  it("创建普通角色时不会误伤空间角色缓存", () => {
    const queryClient = createQueryClientMock();

    invalidateRoleCreateQueries(queryClient, undefined);

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["spaceRole", undefined] });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["spaceRepositoryRole", undefined] });
  });
});

describe("invalidateUpdatedRoleQueries", () => {
  it("会刷新角色详情、角色列表、头像列表和房间角色缓存", () => {
    const queryClient = createQueryClientMock();

    invalidateUpdatedRoleQueries(queryClient, 42);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["getRole", 42] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["getRoleAvatars", 42] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["getUserRolesByType"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["getUserRolesByTypes"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["getUserRoles"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roomRole"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roomRoles"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roomNpcRole"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["clientMetadataBatch"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roleAvatarListsBatch"] });
  });
});
