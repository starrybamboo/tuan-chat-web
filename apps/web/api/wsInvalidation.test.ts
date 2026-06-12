import { describe, expect, it, vi } from "vitest";

import { invalidateMemberChangeQueries, invalidateRoleChangeQueries } from "./wsInvalidation";

function createQueryClientMock() {
  return {
    invalidateQueries: vi.fn(),
  };
}

describe("wsInvalidation", () => {
  it("成员变动会精准失效对应房间和空间缓存", () => {
    const queryClient = createQueryClientMock();

    invalidateMemberChangeQueries(queryClient, { roomId: 12, spaceId: 34 });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["getRoomMemberList", 12] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["getSpaceMemberList", 34] });
  });

  it("角色变动带空间信息时会同步失效房间角色和空间角色缓存", () => {
    const queryClient = createQueryClientMock();

    invalidateRoleChangeQueries(queryClient, { roomId: 56, spaceId: 78 });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["roomRole", 56] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["spaceRole", 78] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["spaceRepositoryRole", 78] });
  });
});
