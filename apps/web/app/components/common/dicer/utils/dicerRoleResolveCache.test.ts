import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RoomContextType } from "@/components/chat/core/roomContext";

import { fetchSpaceInfoWithCache } from "../../../../../api/hooks/chatQueryHooks";
import { fetchRoleWithCache } from "../../../../../api/hooks/RoleAndAvatarHooks";
import UTILS, { invalidateDicerRoleResolveCache } from "./utils";

vi.mock("../../../../../api/hooks/chatQueryHooks", () => ({
  fetchSpaceInfoWithCache: vi.fn(),
}));

vi.mock("../../../../../api/hooks/RoleAndAvatarHooks", () => ({
  fetchRoleWithCache: vi.fn(async (_queryClient: unknown, roleId: number) => ({
    data: { roleId, roleName: `骰娘${roleId}`, type: 1, userId: 1 },
  })),
}));

vi.mock("../../../../../api/instance", () => ({
  tuanchat: {
    roleController: {
      getRole: vi.fn(async (roleId: number) => ({
        data: { roleId, roleName: `骰娘${roleId}`, type: 1, userId: 1 },
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
    vi.mocked(fetchRoleWithCache).mockImplementation(async (_queryClient: unknown, roleId: number) => ({
      success: true,
      data: { roleId, roleName: `骰娘${roleId}`, type: 1, userId: 1 },
    }));
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

  it("当前角色快照缺少 extra 时会拉详情解析角色绑定", async () => {
    const roomContext = {
      spaceId: 43,
      curRoleId: 8,
      roomMembers: [],
      roomRolesThatUserOwn: [],
    } satisfies RoomContextType;
    const fetchRoleWithCacheMock = vi.mocked(fetchRoleWithCache);
    fetchRoleWithCacheMock.mockImplementation(async (_queryClient: unknown, roleId: number) => ({
      success: true,
      data: roleId === 8
        ? { roleId: 8, roleName: "调查员", type: 0, userId: 1, extra: { dicerRoleId: "10" } }
        : { roleId, roleName: `骰娘${roleId}`, type: 1, userId: 1 },
    }));

    const resolved = await UTILS.getDicerRoleId(roomContext, {
      queryClient: {} as any,
      spaceSnapshot: { extra: { dicerRoleId: 11 } },
      currentRoleSnapshot: { roleId: 8 },
    });

    expect(resolved).toBe(10);
    expect(fetchRoleWithCacheMock).toHaveBeenCalledWith(expect.anything(), 8);
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

  it("传入的空间快照不会写入额外缓存，后续按 Query helper 读取空间", async () => {
    const roomContext = {
      spaceId: 42,
      curRoleId: 0,
      roomMembers: [],
      roomRolesThatUserOwn: [],
    } satisfies RoomContextType;
    const fetchSpaceInfoWithCacheMock = vi.mocked(fetchSpaceInfoWithCache);
    fetchSpaceInfoWithCacheMock.mockResolvedValueOnce({
      success: true,
      data: { extra: { dicerRoleId: 12 } },
    } as any);
    const queryClient = {} as any;

    const firstResolved = await UTILS.getDicerRoleId(roomContext, {
      spaceSnapshot: { extra: { dicerRoleId: 11 } },
    });
    const secondResolved = await UTILS.getDicerRoleId(roomContext, {
      queryClient,
    });

    expect(firstResolved).toBe(11);
    expect(secondResolved).toBe(12);
    expect(fetchSpaceInfoWithCacheMock).toHaveBeenCalledWith(queryClient, 42);
  });
});
