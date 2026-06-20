import type { RoomRoleAddRequest } from "@tuanchat/openapi-client/models/RoomRoleAddRequest";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resolveSelectableRoomRoles } from "@tuanchat/domain/room-identity";

type RoomRoleClient = Pick<TuanChat, "roomRoleController" | "roleController" | "avatarController">;

export function getRoomBaseRolesQueryKey(roomId: number | null | undefined) {
  return ["roomRole", roomId ?? null] as const;
}

export function getRoomNpcRolesQueryKey(roomId: number | null | undefined) {
  return ["roomNpcRole", roomId ?? null] as const;
}

export function getUserRolesByTypesQueryKey(userId: number | null | undefined, types: readonly number[]) {
  return ["getUserRolesByTypes", userId ?? null, ...Array.from(new Set(types)).sort((a, b) => a - b)] as const;
}

export function getRoleAvatarsQueryKey(roleId: number | null | undefined) {
  return ["getRoleAvatars", roleId ?? null] as const;
}

export async function fetchUserRolesByTypes(client: RoomRoleClient, userId: number, types: readonly number[]): Promise<UserRole[]> {
  const lists = await Promise.all(Array.from(new Set(types)).map(async (type) => {
    const res = await client.roleController.getUserRolesByType(userId, type);
    return res.data ?? [];
  }));
  const byId = new Map<number, UserRole>();
  for (const role of lists.flat()) {
    if (typeof role.roleId === "number") {
      byId.set(role.roleId, role);
    }
  }
  return Array.from(byId.values());
}

export function useUserRolesByTypesQuery(
  client: RoomRoleClient,
  userId: number | null | undefined,
  types: readonly number[] = [0, 1],
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery({
    enabled: (options.enabled ?? true) && typeof userId === "number" && userId > 0,
    queryFn: () => fetchUserRolesByTypes(client, userId!, types),
    queryKey: [...getUserRolesByTypesQueryKey(userId, types), client],
    staleTime: options.staleTime ?? 600_000,
  });
}

export function useRoomRolesQuery(
  client: RoomRoleClient,
  roomId: number | null | undefined,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery({
    enabled: (options.enabled ?? true) && typeof roomId === "number" && roomId > 0,
    queryFn: async () => {
      const [baseRes, npcRes] = await Promise.all([
        client.roomRoleController.roomRole(roomId!),
        client.roomRoleController.roomNpcRole(roomId!),
      ]);
      return {
        allRoles: [...(baseRes.data ?? []), ...(npcRes.data ?? [])],
        baseRoles: baseRes.data ?? [],
        npcRoles: npcRes.data ?? [],
      };
    },
    queryKey: ["roomRoles", roomId ?? null],
    staleTime: options.staleTime ?? 60_000,
  });
}

function assertRoomRoleMutationSuccess(result: { success?: boolean; errMsg?: string } | null | undefined, fallbackMessage: string) {
  if (result?.success === false) {
    throw new Error(result.errMsg?.trim() || fallbackMessage);
  }
}

/** 将角色绑定到房间，并失效房间角色列表缓存。 */
export function useAddRoomRoleMutation(client: RoomRoleClient) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: RoomRoleAddRequest) => {
      const result = await client.roomRoleController.addRole(request);
      assertRoomRoleMutationSuccess(result, "添加房间角色失败");
      return result;
    },
    mutationKey: ["addRoomRole"],
    onSuccess: (_result, request) => {
      queryClient.invalidateQueries({ queryKey: ["roomRoles", request.roomId] });
      queryClient.invalidateQueries({ queryKey: getRoomBaseRolesQueryKey(request.roomId) });
      queryClient.invalidateQueries({ queryKey: getRoomNpcRolesQueryKey(request.roomId) });
    },
  });
}

export function selectRoomIdentityData(params: {
  isSpaceOwner?: boolean;
  isSpectator: boolean;
  roomBaseRoles: readonly UserRole[];
  roomNpcRoles?: readonly UserRole[];
  userRoles?: readonly UserRole[];
}) {
  const selectableRoles = resolveSelectableRoomRoles(params);
  return {
    selectableRoleIds: new Set(selectableRoles.map(role => role.roleId).filter((roleId): roleId is number => typeof roleId === "number")),
    selectableRoles,
  };
}
