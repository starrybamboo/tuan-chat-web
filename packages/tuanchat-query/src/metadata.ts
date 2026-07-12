import type { QueryClient } from "@tanstack/react-query";
import type { ClientMetadataBatchRequest } from "@tuanchat/openapi-client/models/ClientMetadataBatchRequest";
import type { ClientMetadataBatchResponse } from "@tuanchat/openapi-client/models/ClientMetadataBatchResponse";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type MetadataClient = Pick<TuanChat, "avatarController" | "clientMetadataController">;

export const CLIENT_METADATA_STALE_TIME_MS = 600_000;
export const ROLE_AVATAR_LIST_STALE_TIME_MS = 86_400_000;
const BATCH_ID_LIMIT = 100;

function normalizeIds(ids: readonly number[] | null | undefined) {
  return Array.from(new Set((ids ?? []).filter(id => Number.isFinite(id) && id > 0))).sort((a, b) => a - b);
}

function normalizeMetadataRequest(request: ClientMetadataBatchRequest): ClientMetadataBatchRequest {
  return {
    avatarIds: normalizeIds(request.avatarIds),
    roleIds: normalizeIds(request.roleIds),
    userIds: normalizeIds(request.userIds),
  };
}

function chunkIds(ids: readonly number[], offset: number) {
  return ids.slice(offset, offset + BATCH_ID_LIMIT);
}

export function clientMetadataBatchQueryKey(request: ClientMetadataBatchRequest, client?: MetadataClient) {
  const normalized = normalizeMetadataRequest(request);
  return ["clientMetadataBatch", normalized.roleIds, normalized.userIds, normalized.avatarIds, client] as const;
}

export function seedClientMetadataCaches(queryClient: QueryClient, metadata: ClientMetadataBatchResponse) {
  Object.values(metadata.roles ?? {}).forEach((role) => {
    if (role.roleId) {
      queryClient.setQueryData(["getRole", role.roleId], { success: true, data: role });
    }
  });
  Object.values(metadata.users ?? {}).forEach((user) => {
    if (user.userId) {
      queryClient.setQueryData(["getUserInfo", user.userId], { success: true, data: user });
    }
  });
  Object.values(metadata.avatars ?? {}).forEach((avatar) => {
    if (avatar.avatarId) {
      queryClient.setQueryData(["getRoleAvatar", avatar.avatarId], { success: true, data: avatar });
    }
  });
}

export async function loadClientMetadataBatch(
  client: MetadataClient,
  request: ClientMetadataBatchRequest,
) {
  const normalized = normalizeMetadataRequest(request);
  const total = Math.max(normalized.avatarIds?.length ?? 0, normalized.roleIds?.length ?? 0, normalized.userIds?.length ?? 0);
  const metadata: ClientMetadataBatchResponse = { avatars: {}, roles: {}, users: {} };
  for (let offset = 0; offset < total; offset += BATCH_ID_LIMIT) {
    const response = await client.clientMetadataController.getBatch({
      avatarIds: chunkIds(normalized.avatarIds ?? [], offset),
      roleIds: chunkIds(normalized.roleIds ?? [], offset),
      userIds: chunkIds(normalized.userIds ?? [], offset),
    });
    if (!response.success) {
      throw new Error(response.errMsg || "批量获取客户端元数据失败");
    }
    Object.assign(metadata.avatars!, response.data?.avatars);
    Object.assign(metadata.roles!, response.data?.roles);
    Object.assign(metadata.users!, response.data?.users);
  }
  return metadata;
}

export async function fetchClientMetadataBatchWithCache(
  queryClient: QueryClient,
  client: MetadataClient,
  request: ClientMetadataBatchRequest,
) {
  const normalized = normalizeMetadataRequest(request);
  if (!normalized.roleIds?.length && !normalized.userIds?.length && !normalized.avatarIds?.length) {
    return {} as ClientMetadataBatchResponse;
  }
  const metadata = await queryClient.fetchQuery({
    queryFn: () => loadClientMetadataBatch(client, normalized),
    queryKey: clientMetadataBatchQueryKey(normalized, client),
    staleTime: CLIENT_METADATA_STALE_TIME_MS,
  });
  seedClientMetadataCaches(queryClient, metadata);
  return metadata;
}

export function roleAvatarListsBatchQueryKey(roleIds: readonly number[]) {
  return ["roleAvatarListsBatch", normalizeIds(roleIds)] as const;
}

function seedRoleAvatarListCaches(
  queryClient: QueryClient,
  avatarsByRoleId: Record<string, RoleAvatar[]>,
) {
  Object.entries(avatarsByRoleId).forEach(([roleIdKey, avatars]) => {
    const roleId = Number(roleIdKey);
    if (roleId > 0) {
      queryClient.setQueryData(["getRoleAvatars", roleId], { success: true, data: avatars });
      queryClient.setQueryData(["roleAvatars", roleId], avatars);
    }
    avatars.forEach((avatar) => {
      if (avatar.avatarId) {
        queryClient.setQueryData(["getRoleAvatar", avatar.avatarId], { success: true, data: avatar });
      }
    });
  });
}

export async function fetchRoleAvatarListsBatchWithCache(
  queryClient: QueryClient,
  client: MetadataClient,
  roleIds: readonly number[],
) {
  const normalizedRoleIds = normalizeIds(roleIds);
  if (normalizedRoleIds.length === 0) {
    return {} as Record<string, RoleAvatar[]>;
  }
  const avatarsByRoleId = await queryClient.fetchQuery({
    queryFn: async () => {
      const merged: Record<string, RoleAvatar[]> = {};
      for (let offset = 0; offset < normalizedRoleIds.length; offset += BATCH_ID_LIMIT) {
        const response = await client.avatarController.getRoleAvatarsBatch({
          roleIds: chunkIds(normalizedRoleIds, offset),
        });
        if (!response.success) {
          throw new Error(response.errMsg || "批量获取角色头像失败");
        }
        Object.assign(merged, response.data);
      }
      return merged;
    },
    queryKey: roleAvatarListsBatchQueryKey(normalizedRoleIds),
    staleTime: ROLE_AVATAR_LIST_STALE_TIME_MS,
  });
  seedRoleAvatarListCaches(queryClient, avatarsByRoleId);
  return avatarsByRoleId;
}
