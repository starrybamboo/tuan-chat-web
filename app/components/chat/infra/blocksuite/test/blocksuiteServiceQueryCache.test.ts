import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { listBlocksuiteMentionRoles } from "../services/blocksuiteRoleService";
import { listBlocksuiteRoomIdsForSpace } from "../services/blocksuiteRoomService";
import { listBlocksuiteSpaceMemberIds } from "../services/blocksuiteSpaceMemberService";
import { createTuanChatRoleService } from "../services/tuanChatRoleService";
import { createTuanChatUserService } from "../services/tuanChatUserService";

const {
  getMemberListMock,
  getRoleMock,
  getUserInfoMock,
  getUserRoomsMock,
  roomNpcRoleMock,
  tuanchatMock,
} = vi.hoisted(() => {
  const getMemberListMock = vi.fn();
  const getRoleMock = vi.fn();
  const getUserInfoMock = vi.fn();
  const getUserRoomsMock = vi.fn();
  const roomNpcRoleMock = vi.fn();
  const spaceRoleMock = vi.fn();

  return {
    getMemberListMock,
    getRoleMock,
    getUserInfoMock,
    getUserRoomsMock,
    roomNpcRoleMock,
    spaceRoleMock,
    tuanchatMock: {
      roleController: {
        getRole: getRoleMock,
      },
      roomController: {
        getUserRooms: getUserRoomsMock,
      },
      roomRoleController: {
        roomNpcRole: roomNpcRoleMock,
      },
      spaceMemberController: {
        getMemberList: getMemberListMock,
      },
      spaceRepositoryController: {
        spaceRole: spaceRoleMock,
      },
      userController: {
        getUserInfo: getUserInfoMock,
      },
    },
  };
});

vi.mock("api/instance", () => ({
  tuanchat: tuanchatMock,
}));

vi.mock("../../../../../../api/instance", () => ({
  tuanchat: tuanchatMock,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe("blocksuite service React Query cache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("用户 service 会复用 getUserInfo 查询缓存", async () => {
    const queryClient = createQueryClient();
    getUserInfoMock.mockResolvedValue({
      success: true,
      data: {
        userId: 12,
        username: "Alice",
        avatar: "alice.png",
      },
    });

    await createTuanChatUserService({ queryClient }).prefetch(["12"]);
    expect(getUserInfoMock).toHaveBeenCalledTimes(1);

    getUserInfoMock.mockClear();
    const secondService = createTuanChatUserService({ queryClient });
    await secondService.prefetch(["12"]);

    expect(getUserInfoMock).not.toHaveBeenCalled();
    expect(secondService.getCachedUserInfo("12")).toMatchObject({
      id: "12",
      name: "Alice",
      avatar: "alice.png",
    });
  });

  it("角色 service 会复用 getRole 查询缓存", async () => {
    const queryClient = createQueryClient();
    getRoleMock.mockResolvedValue({
      success: true,
      data: {
        roleId: 34,
        roleName: "旁白",
        avatarUrl: "role.png",
        description: "narrator",
        type: 2,
      },
    });

    await createTuanChatRoleService({ queryClient }).prefetch(["34"]);
    expect(getRoleMock).toHaveBeenCalledTimes(1);

    getRoleMock.mockClear();
    const secondService = createTuanChatRoleService({ queryClient });
    await secondService.prefetch(["34"]);

    expect(getRoleMock).not.toHaveBeenCalled();
    expect(secondService.getCachedRoleInfo("34")).toMatchObject({
      id: "34",
      name: "旁白",
      avatar: "role.png",
      description: "narrator",
    });
  });

  it("mention 角色列表会复用 roomNpcRole 查询缓存", async () => {
    const queryClient = createQueryClient();
    roomNpcRoleMock.mockResolvedValue({
      data: [
        { roleId: 101, roleName: "酒馆老板", type: 2, userId: 0 },
      ],
    });

    await expect(listBlocksuiteMentionRoles({
      spaceId: 7,
      currentDocId: "room:9:description",
      queryClient,
    })).resolves.toHaveLength(1);

    roomNpcRoleMock.mockClear();
    await expect(listBlocksuiteMentionRoles({
      spaceId: 7,
      currentDocId: "room:9:description",
      queryClient,
    })).resolves.toHaveLength(1);

    expect(roomNpcRoleMock).not.toHaveBeenCalled();
  });

  it("房间列表和空间成员列表 service 会复用共享查询缓存", async () => {
    const queryClient = createQueryClient();
    getUserRoomsMock.mockResolvedValue({
      data: {
        rooms: [{ roomId: 1 }, { roomId: 2 }],
      },
    });
    getMemberListMock.mockResolvedValue({
      data: [{ userId: 11 }, { userId: 12 }],
    });

    await expect(listBlocksuiteRoomIdsForSpace(7, queryClient)).resolves.toEqual(new Set([1, 2]));
    await expect(listBlocksuiteSpaceMemberIds(7, queryClient)).resolves.toEqual([11, 12]);

    getUserRoomsMock.mockClear();
    getMemberListMock.mockClear();

    await expect(listBlocksuiteRoomIdsForSpace(7, queryClient)).resolves.toEqual(new Set([1, 2]));
    await expect(listBlocksuiteSpaceMemberIds(7, queryClient)).resolves.toEqual([11, 12]);

    expect(getUserRoomsMock).not.toHaveBeenCalled();
    expect(getMemberListMock).not.toHaveBeenCalled();
  });
});
