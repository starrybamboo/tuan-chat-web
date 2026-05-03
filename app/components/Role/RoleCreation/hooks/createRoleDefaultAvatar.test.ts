import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureCreatedRoleDefaultAvatar, ensureRoleAvatarDefaultMedia } from "./createRoleDefaultAvatar";

const { getRoleAvatarMock, updateRoleAvatarMock, uploadMediaFileMock } = vi.hoisted(() => ({
  getRoleAvatarMock: vi.fn(),
  updateRoleAvatarMock: vi.fn(),
  uploadMediaFileMock: vi.fn(),
}));

vi.mock("@/../api/instance", () => ({
  tuanchat: {
    avatarController: {
      getRoleAvatar: getRoleAvatarMock,
      updateRoleAvatar: updateRoleAvatarMock,
    },
  },
}));

vi.mock("@/utils/mediaUpload", () => ({
  uploadMediaFile: uploadMediaFileMock,
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
    vi.unstubAllGlobals();
  });

  it("创建默认头像后会把已有头像文件补成默认立绘并写入缓存", async () => {
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

  it("默认头像没有媒体文件时，会上传默认图并同时写入头像和立绘", async () => {
    const queryClient = createQueryClient();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("cors")));
    uploadMediaFileMock.mockResolvedValueOnce({
      fileId: 91,
      mediaType: "image",
      uploadRequired: true,
    });
    getRoleAvatarMock.mockResolvedValueOnce({
      success: true,
      data: {
        avatarId: 34,
        roleId: 12,
      },
    });
    updateRoleAvatarMock.mockResolvedValueOnce({
      success: true,
      data: {
        avatarId: 34,
        roleId: 12,
        avatarFileId: 91,
        spriteFileId: 91,
      },
    });

    const avatar = await ensureRoleAvatarDefaultMedia(queryClient, 12, 34);

    expect(uploadMediaFileMock).toHaveBeenCalledTimes(1);
    expect(updateRoleAvatarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarId: 34,
        roleId: 12,
        avatarFileId: 91,
        spriteFileId: 91,
      }),
    );
    expect(avatar).toMatchObject({
      avatarId: 34,
      roleId: 12,
      avatarFileId: 91,
      spriteFileId: 91,
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
