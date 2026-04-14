import { describe, expect, it, vi } from "vitest";

import { invalidateRoleCreateQueries } from "./roleMutationInvalidation";

function createQueryClientMock() {
  return {
    invalidateQueries: vi.fn(),
  };
}

describe("invalidateRoleCreateQueries", () => {
  it("创建空间角色后会失效空间角色相关缓存", () => {
    const queryClient = createQueryClientMock();

    invalidateRoleCreateQueries(queryClient, 99);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["spaceRole", 99] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["spaceRepositoryRole", 99] });
  });

  it("创建普通角色时不会误伤空间角色缓存", () => {
    const queryClient = createQueryClientMock();

    invalidateRoleCreateQueries(queryClient, undefined);

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["spaceRole", undefined] });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["spaceRepositoryRole", undefined] });
  });
});
