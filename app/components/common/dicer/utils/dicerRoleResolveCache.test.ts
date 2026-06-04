import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RoomContextType } from "@/components/chat/core/roomContext";

import { fetchSpaceInfoWithCache } from "../../../../../api/hooks/chatQueryHooks";
import UTILS, { invalidateDicerRoleResolveCache } from "./utils";

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

  it("角色绑定优先于空间骰娘", async () => {
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

    expect(resolved).toBe(10);
  });

  it("没有角色绑定时回退到空间骰娘", async () => {
    const roomContext = {
      spaceId: 43,
      curRoleId: 8,
      roomMembers: [],
      roomRolesThatUserOwn: [],
    } satisfies RoomContextType;

    const resolved = await UTILS.getDicerRoleId(roomContext, {
      spaceSnapshot: { extra: { dicerRoleId: 11 } },
      currentRoleSnapshot: { roleId: 8, extra: {} },
    });

    expect(resolved).toBe(11);
  });

  it("空间骰娘变更后传入的新快照会立即参与计算", async () => {
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
    expect(cachedResolved).toBe(11);
  });

  it("传入的空间快照会写入输入层缓存供后续计算复用", async () => {
    const roomContext = {
      spaceId: 42,
      curRoleId: 0,
      roomMembers: [],
      roomRolesThatUserOwn: [],
    } satisfies RoomContextType;
    const fetchSpaceInfoWithCacheMock = vi.mocked(fetchSpaceInfoWithCache);

    const firstResolved = await UTILS.getDicerRoleId(roomContext, {
      spaceSnapshot: { extra: { dicerRoleId: 11 } },
    });
    const secondResolved = await UTILS.getDicerRoleId(roomContext, {
      queryClient: {} as any,
    });

    expect(firstResolved).toBe(11);
    expect(secondResolved).toBe(11);
    expect(fetchSpaceInfoWithCacheMock).not.toHaveBeenCalled();
  });
});
