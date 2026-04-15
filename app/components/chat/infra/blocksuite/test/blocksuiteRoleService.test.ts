import { afterEach, describe, expect, it, vi } from "vitest";

import { tuanchat } from "api/instance";

import { listBlocksuiteMentionRoles } from "../services/blocksuiteRoleService";

vi.mock("api/instance", () => ({
  tuanchat: {
    roomRoleController: {
      roomNpcRole: vi.fn(),
    },
    spaceRepositoryController: {
      spaceRole: vi.fn(),
    },
  },
}));

const mockedRoomNpcRole = vi.mocked(tuanchat.roomRoleController.roomNpcRole);
const mockedSpaceRole = vi.mocked(tuanchat.spaceRepositoryController.spaceRole);

describe("blocksuiteRoleService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("房间描述文档只返回当前房间的 NPC 角色", async () => {
    mockedRoomNpcRole.mockResolvedValueOnce({
      data: [
        { roleId: 101, roleName: "酒馆老板", type: 2, userId: 0 },
        { roleId: 102, roleName: "玩家角色", type: 0, userId: 88 },
      ],
    } as any);

    const result = await listBlocksuiteMentionRoles({
      spaceId: 7,
      currentDocId: "room:12:description",
    });

    expect(mockedRoomNpcRole).toHaveBeenCalledWith(12);
    expect(mockedSpaceRole).not.toHaveBeenCalled();
    expect(result.map(role => role.roleId)).toEqual([101]);
    expect(result[0]?.roleName).toBe("酒馆老板");
  });

  it("房间 NPC 列表失败时会回退到空间 NPC 列表", async () => {
    mockedRoomNpcRole.mockRejectedValueOnce(new Error("network"));
    mockedSpaceRole.mockResolvedValueOnce({
      data: [
        { roleId: 201, roleName: "旁白", type: 2, userId: 0 },
        { roleId: 202, roleName: "玩家角色", type: 0, userId: 66 },
      ],
    } as any);

    const result = await listBlocksuiteMentionRoles({
      spaceId: 9,
      currentDocId: "room:18:description",
    });

    expect(mockedRoomNpcRole).toHaveBeenCalledWith(18);
    expect(mockedSpaceRole).toHaveBeenCalledWith(9);
    expect(result.map(role => role.roleId)).toEqual([201]);
    expect(result[0]?.roleName).toBe("旁白");
  });
});
