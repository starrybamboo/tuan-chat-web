import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RoomContextType } from "@/components/chat/core/roomContext";

import UTILS, { invalidateDicerRoleResolveCache } from "./utils";

vi.mock("@tuanchat/query/users", () => ({
  fetchMyUserInfoWithCache: vi.fn(async () => ({ data: { extra: { dicerRoleId: 12 } } })),
}));

vi.mock("../../../../../api/hooks/chatQueryHooks", () => ({
  fetchSpaceInfoWithCache: vi.fn(),
}));

vi.mock("../../../../../api/hooks/RoleAndAvatarHooks", () => ({
  fetchRoleWithCache: vi.fn(async (_queryClient: unknown, roleId: number) => ({
    data: { roleId, roleName: `骰娘${roleId}`, type: 1 },
  })),
}));

vi.mock("../../../../../api/instance", () => ({
  tuanchat: {
    roleController: {
      getRole: vi.fn(async (roleId: number) => ({
        data: { roleId, roleName: `骰娘${roleId}`, type: 1 },
      })),
    },
    spaceController: {
      getSpaceInfo: vi.fn(),
    },
    userController: {
      getMyUserInfo: vi.fn(async () => ({ data: { extra: {} } })),
    },
  },
}));

describe("dicer role resolve cache", () => {
  beforeEach(() => {
    invalidateDicerRoleResolveCache();
    vi.clearAllMocks();
  });

  it("空间骰娘优先于角色和用户绑定", async () => {
    const roomContext = {
      spaceId: 42,
      curRoleId: 7,
      roomMembers: [],
      roomRolesThatUserOwn: [],
    } satisfies RoomContextType;

    const resolved = await UTILS.getDicerRoleId(roomContext, {
      spaceSnapshot: { extra: { dicerRoleId: 11 } },
      currentRoleSnapshot: { roleId: 7, extra: { dicerRoleId: 10 } },
    });

    expect(resolved).toBe(11);
  });

  it("没有空间骰娘时仍会回退到角色绑定", async () => {
    const roomContext = {
      spaceId: 43,
      curRoleId: 8,
      roomMembers: [],
      roomRolesThatUserOwn: [],
    } satisfies RoomContextType;

    const resolved = await UTILS.getDicerRoleId(roomContext, {
      spaceSnapshot: { extra: {} },
      currentRoleSnapshot: { roleId: 8, extra: { dicerRoleId: 10 } },
    });

    expect(resolved).toBe(10);
  });

  it("空间骰娘变更后按空间清理旧解析结果", async () => {
    const roomContext = {
      spaceId: 42,
      curRoleId: 0,
      roomMembers: [],
      roomRolesThatUserOwn: [],
    } satisfies RoomContextType;

    const firstResolved = await UTILS.getDicerRoleId(roomContext, {
      spaceSnapshot: { extra: { dicerRoleId: 10 } },
    });
    const cachedResolved = await UTILS.getDicerRoleId(roomContext, {
      spaceSnapshot: { extra: { dicerRoleId: 11 } },
    });

    expect(firstResolved).toBe(10);
    expect(cachedResolved).toBe(10);

    invalidateDicerRoleResolveCache(42);

    const resolvedAfterInvalidation = await UTILS.getDicerRoleId(roomContext, {
      spaceSnapshot: { extra: { dicerRoleId: 11 } },
    });

    expect(resolvedAfterInvalidation).toBe(11);
  });
});
