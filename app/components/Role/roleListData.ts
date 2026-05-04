import type { RoleAvatar, UserRole } from "api";

import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { avatarThumbUrl as buildAvatarThumbUrl, avatarUrl as buildAvatarUrl } from "@/utils/mediaUrl";

import type { Role } from "./types";

export type RoleListAvatarFields = UserRole & {
  avatarUrl?: string;
  avatarThumbUrl?: string;
};

type RoleAvatarUrlSource = {
  avatarFileId?: number;
  avatarUrl?: string;
  avatarThumbUrl?: string;
};

type CachedRoleAvatarRecord = {
  data?: RoleAvatar;
};

type QueryClientLike = {
  getQueryData: <T>(queryKey: unknown[]) => T | undefined;
  fetchQuery: <T>(options: {
    queryKey: unknown[];
    queryFn: () => Promise<T>;
    staleTime?: number;
  }) => Promise<T>;
};

type HydrateRoleListOptions = {
  previousRoles: Role[];
  diceRoles: RoleListAvatarFields[];
  normalRoles: RoleListAvatarFields[];
  queryClient: QueryClientLike;
  seedRoleAvatarQueryCaches: (queryClient: QueryClientLike, avatar: RoleAvatar, roleId?: number) => void;
  fetchRoleAvatar: (avatarId: number) => Promise<{ success: boolean; data?: RoleAvatar }>;
};

export function resolveRoleAvatarUrls(source?: RoleAvatarUrlSource | null) {
  const avatarUrl = source?.avatarUrl || buildAvatarUrl(source?.avatarFileId);
  const avatarThumbUrl = source?.avatarThumbUrl || buildAvatarThumbUrl(source?.avatarFileId) || avatarUrl;
  return {
    avatarUrl,
    avatarThumbUrl,
  };
}

export function mapUserRoleToRole(role: RoleListAvatarFields): Role {
  const { avatarUrl, avatarThumbUrl } = resolveRoleAvatarUrls(role);
  return {
    id: role.roleId || 0,
    name: role.roleName || "",
    description: role.description || "无描述",
    avatar: avatarUrl,
    avatarThumb: avatarThumbUrl,
    avatarId: role.avatarId || 0,
    voiceUrl: role.voiceUrl || undefined,
    type: role.type ?? (role.diceMaiden ? 1 : 0),
    extra: role.extra || {},
  };
}

export function mergeRoleList(previousRoles: Role[], nextRoles: Role[]): Role[] {
  const previousById = new Map(
    previousRoles
      .filter(role => role.type !== 2)
      .map(role => [role.id, role]),
  );

  return nextRoles
    .filter(role => role.type !== 2)
    .map((role) => {
      const previousRole = previousById.get(role.id);
      if (!previousRole) {
        return role;
      }

      return {
        ...previousRole,
        ...role,
        avatar: role.avatar || previousRole.avatar,
        avatarThumb: role.avatarThumb || previousRole.avatarThumb || role.avatar,
      };
    });
}

export async function hydrateRoleList({
  previousRoles,
  diceRoles,
  normalRoles,
  queryClient,
  seedRoleAvatarQueryCaches,
  fetchRoleAvatar,
}: HydrateRoleListOptions): Promise<Role[]> {
  const mergedUserRoles = [...diceRoles, ...normalRoles];
  const mappedRoles = mergedUserRoles
    .map(mapUserRoleToRole)
    .filter(role => role.type !== 2);

  for (const role of mappedRoles) {
    if (!role.avatarId || (!role.avatar && !role.avatarThumb)) {
      continue;
    }
    seedRoleAvatarQueryCaches(queryClient, {
      avatarId: role.avatarId,
      roleId: role.id,
    }, role.id);
  }

  let hydratedRoles = mergeRoleList(previousRoles, mappedRoles);

  const avatarResults = await Promise.all(
    mappedRoles.map(async (role) => {
      if (!role.avatarId || role.avatar || role.avatarThumb) {
        return null;
      }

      const cachedAvatar = queryClient.getQueryData<CachedRoleAvatarRecord>(["getRoleAvatar", role.avatarId])?.data;
      const cachedAvatarUrls = resolveRoleAvatarUrls(cachedAvatar);
      if (cachedAvatarUrls.avatarUrl || cachedAvatarUrls.avatarThumbUrl) {
        const avatarUrl = cachedAvatarUrls.avatarUrl || ROLE_DEFAULT_AVATAR_URL;
        const avatarThumbUrl = cachedAvatarUrls.avatarThumbUrl || avatarUrl;
        return { id: role.id, avatar: avatarUrl, avatarThumb: avatarThumbUrl };
      }

      try {
        const response = await queryClient.fetchQuery({
          queryKey: ["getRoleAvatar", role.avatarId],
          queryFn: () => fetchRoleAvatar(role.avatarId),
          staleTime: 86400000,
        });

        if (response.success && response.data) {
          const responseAvatarUrls = resolveRoleAvatarUrls(response.data);
          const avatarUrl = responseAvatarUrls.avatarUrl || ROLE_DEFAULT_AVATAR_URL;
          const avatarThumbUrl = responseAvatarUrls.avatarThumbUrl || avatarUrl;
          seedRoleAvatarQueryCaches(queryClient, response.data, role.id);
          return { id: role.id, avatar: avatarUrl, avatarThumb: avatarThumbUrl };
        }
      }
      catch (error) {
        console.error(`加载角色 ${role.id} 的头像时出错`, error);
      }

      return null;
    }),
  );

  const validAvatars = avatarResults.filter(result => result !== null);
  if (validAvatars.length === 0) {
    return hydratedRoles;
  }

  hydratedRoles = hydratedRoles.map((role) => {
    const avatarData = validAvatars.find(avatar => avatar.id === role.id);
    return avatarData
      ? { ...role, avatar: avatarData.avatar, avatarThumb: avatarData.avatarThumb }
      : role;
  });

  return hydratedRoles;
}
