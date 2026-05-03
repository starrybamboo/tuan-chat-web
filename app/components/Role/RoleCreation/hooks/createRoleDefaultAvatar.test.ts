import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureCreatedRoleDefaultAvatar } from "./createRoleDefaultAvatar";

const { getRoleAvatarMock, updateRoleAvatarMock } = vi.hoisted(() => ({
  getRoleAvatarMock: vi.fn(),
  updateRoleAvatarMock: vi.fn(),
}));

vi.mock("@/../api/instance", () => ({
  tuanchat: {
    avatarController: {
      getRoleAvatar: getRoleAvatarMock,
      updateRoleAvatar: updateRoleAvatarMock,
    },
  },
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

describe("ensureCreatedRoleDefaultAvatar", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("创建默认头像后会把同图补成默认立绘并写入缓存", async () => {
    const queryClient = createQueryClient();
    getRoleAvatarMock.mockResolvedValueOnce({
      success: true,
      data: {
        avatarId: 34,
        roleId: 12,
        avatarFileId: 56,
      },
    });
    updateRoleAvatarMock.mockResolvedValueOnce({
      success: true,
      data: {
        avatarId: 34,
        roleId: 12,
        avatarFileId: 56,
        spriteFileId: 56,
      },
    });

    const avatar = await ensureCreatedRoleDefaultAvatar(queryClient, 12, 34);

    expect(getRoleAvatarMock).toHaveBeenCalledWith(34);
    expect(updateRoleAvatarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarId: 34,
        roleId: 12,
        avatarFileId: 56,
        spriteFileId: 56,
      }),
    );
    expect(avatar).toMatchObject({
      avatarId: 34,
      roleId: 12,
      avatarFileId: 56,
      spriteFileId: 56,
    });
    expect(queryClient.getQueryData(["getRoleAvatars", 12])).toMatchObject({
      success: true,
      data: [
        {
          avatarId: 34,
          roleId: 12,
          avatarFileId: 56,
          spriteFileId: 56,
        },
      ],
    });
  });

  it("默认头像本身已有立绘时不重复补写", async () => {
    const queryClient = createQueryClient();
    getRoleAvatarMock.mockResolvedValueOnce({
      success: true,
      data: {
        avatarId: 34,
        roleId: 12,
        avatarFileId: 56,
        spriteFileId: 78,
      },
    });

    const avatar = await ensureCreatedRoleDefaultAvatar(queryClient, 12, 34);

    expect(updateRoleAvatarMock).not.toHaveBeenCalled();
    expect(avatar).toMatchObject({
      avatarId: 34,
      roleId: 12,
      avatarFileId: 56,
      spriteFileId: 78,
    });
  });
});
