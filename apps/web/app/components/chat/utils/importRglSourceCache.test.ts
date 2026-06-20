import type { QueryClient } from "@tanstack/react-query";

import { describe, expect, it, vi } from "vitest";

import {
  refreshRglMaterialImportSourceCaches,
  refreshRglRoleAvatarImportSourceCaches,
  rglMaterialImportPackagesQueryKey,
} from "./importRglSourceCache";

function queryClientMock() {
  return {
    invalidateQueries: vi.fn(async () => undefined),
    removeQueries: vi.fn(),
  } as unknown as QueryClient & {
    invalidateQueries: ReturnType<typeof vi.fn>;
    removeQueries: ReturnType<typeof vi.fn>;
  };
}

describe("rglMaterialImportPackagesQueryKey", () => {
  it("生成 RGL 导入专用素材包查询 key", () => {
    expect(rglMaterialImportPackagesQueryKey(42)).toEqual(["spaceMaterialPackage", "rglImportAll", 42]);
  });
});

describe("refreshRglMaterialImportSourceCaches", () => {
  it("移除 RGL 专用素材包缓存并刷新素材包列表", async () => {
    const queryClient = queryClientMock();

    await refreshRglMaterialImportSourceCaches(queryClient, 42);

    expect(queryClient.removeQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: ["spaceMaterialPackage", "rglImportAll", 42],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["spaceMaterialPackage"],
    });
  });
});

describe("refreshRglRoleAvatarImportSourceCaches", () => {
  it("按角色和头像去重刷新 RGL 角色素材来源缓存", async () => {
    const queryClient = queryClientMock();

    await refreshRglRoleAvatarImportSourceCaches(queryClient, [
      { roleId: 10, avatarId: 100 },
      { roleId: 10, avatarId: 100 },
      { roleId: 11, avatarId: 101 },
      { roleId: 0, avatarId: -1 },
    ]);

    expect(queryClient.removeQueries).toHaveBeenCalledTimes(4);
    expect(queryClient.removeQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: ["getRoleAvatars", 10],
    });
    expect(queryClient.removeQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: ["getRoleAvatars", 11],
    });
    expect(queryClient.removeQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: ["getRoleAvatar", 100],
    });
    expect(queryClient.removeQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: ["getRoleAvatar", 101],
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(4);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: ["getRoleAvatars", 10],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: ["getRoleAvatar", 101],
    });
  });
});
