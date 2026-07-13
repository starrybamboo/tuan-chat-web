import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  fetchClientMetadataBatchWithCache,
  fetchRoleAvatarListsBatchWithCache,
  invalidateClientMetadataBatchQueries,
  invalidateRoleMetadataBatchQueries,
} from "./metadata";

describe("metadata batch cache", () => {
  it("merges duplicate ids into one request and seeds detail caches", async () => {
    const queryClient = new QueryClient();
    const getBatch = vi.fn<(request: any) => Promise<any>>().mockResolvedValue({
      success: true,
      data: {
        avatars: { 3: { avatarId: 3, avatarFileId: 30 } },
        roles: { 1: { roleId: 1, roleName: "角色" } },
        users: { 2: { userId: 2, username: "用户" } },
      },
    });
    const client = { clientMetadataController: { getBatch } } as any;

    await fetchClientMetadataBatchWithCache(queryClient, client, {
      avatarIds: [3, 3],
      roleIds: [1, 1],
      userIds: [2, 2],
    });

    expect(getBatch).toHaveBeenCalledOnce();
    expect(getBatch).toHaveBeenCalledWith({ avatarIds: [3], roleIds: [1], userIds: [2] });
    expect(queryClient.getQueryData(["getRole", 1])).toMatchObject({ data: { roleName: "角色" } });
    expect(queryClient.getQueryData(["getUserInfo", 2])).toMatchObject({ data: { username: "用户" } });
    expect(queryClient.getQueryData(["getRoleAvatar", 3])).toMatchObject({ data: { avatarFileId: 30 } });
  });

  it("seeds avatar list and detail cache from one batch request", async () => {
    const queryClient = new QueryClient();
    const getRoleAvatarsBatch = vi.fn<(request: any) => Promise<any>>().mockResolvedValue({
      success: true,
      data: { 7: [{ avatarId: 8, roleId: 7, avatarFileId: 80 }] },
    });
    const client = { avatarController: { getRoleAvatarsBatch } } as any;

    await fetchRoleAvatarListsBatchWithCache(queryClient, client, [7, 7]);

    expect(getRoleAvatarsBatch).toHaveBeenCalledWith({ roleIds: [7] });
    expect(queryClient.getQueryData(["getRoleAvatars", 7])).toMatchObject({ data: [{ avatarId: 8 }] });
    expect(queryClient.getQueryData(["roleAvatars", 7])).toMatchObject([{ avatarId: 8 }]);
    expect(queryClient.getQueryData(["getRoleAvatar", 8])).toMatchObject({ data: { avatarFileId: 80 } });
  });

  it("splits requests only when ids exceed the backend limit", async () => {
    const queryClient = new QueryClient();
    const getBatch = vi.fn<(request: any) => Promise<any>>().mockResolvedValue({ success: true, data: {} });
    const client = { clientMetadataController: { getBatch } } as any;
    const roleIds = Array.from({ length: 101 }, (_, index) => index + 1);

    await fetchClientMetadataBatchWithCache(queryClient, client, { roleIds });

    expect(getBatch).toHaveBeenCalledTimes(2);
    expect(getBatch.mock.calls[0]?.[0].roleIds).toHaveLength(100);
    expect(getBatch.mock.calls[1]?.[0].roleIds).toEqual([101]);
  });

  it("refetches client metadata after the aggregate cache is invalidated", async () => {
    const queryClient = new QueryClient();
    const getBatch = vi.fn<(request: any) => Promise<any>>()
      .mockResolvedValueOnce({
        success: true,
        data: { roles: { 1: { roleId: 1, roleName: "旧角色名" } } },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { roles: { 1: { roleId: 1, roleName: "新角色名" } } },
      });
    const client = { clientMetadataController: { getBatch } } as any;

    await fetchClientMetadataBatchWithCache(queryClient, client, { roleIds: [1] });
    invalidateClientMetadataBatchQueries(queryClient);
    await fetchClientMetadataBatchWithCache(queryClient, client, { roleIds: [1] });

    expect(getBatch).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(["getRole", 1])).toMatchObject({ data: { roleName: "新角色名" } });
  });

  it("refetches avatar lists after role metadata caches are invalidated", async () => {
    const queryClient = new QueryClient();
    const getRoleAvatarsBatch = vi.fn<(request: any) => Promise<any>>()
      .mockResolvedValueOnce({
        success: true,
        data: { 7: [{ avatarId: 8, roleId: 7, avatarFileId: 80 }] },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { 7: [{ avatarId: 9, roleId: 7, avatarFileId: 90 }] },
      });
    const client = { avatarController: { getRoleAvatarsBatch } } as any;

    await fetchRoleAvatarListsBatchWithCache(queryClient, client, [7]);
    invalidateRoleMetadataBatchQueries(queryClient);
    await fetchRoleAvatarListsBatchWithCache(queryClient, client, [7]);

    expect(getRoleAvatarsBatch).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(["getRoleAvatars", 7])).toMatchObject({ data: [{ avatarId: 9 }] });
  });
});
