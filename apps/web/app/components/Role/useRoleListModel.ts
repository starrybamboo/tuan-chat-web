import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { tuanchat } from "@/../api/instance";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { seedRoleAvatarQueryCaches, useGetUserRolesByTypeQuery } from "api/hooks/RoleAndAvatarHooks";
import { createUniqueQuerySlots } from "api/hooks/querySlots";

import { mapUserRoleToRole, resolveRoleAvatarUrls } from "./roleListData";

type RoleListItem = ReturnType<typeof mapUserRoleToRole>;

function shouldLoadRoleAvatar(role: RoleListItem): boolean {
  return role.avatarId > 0 && !role.avatar && !role.avatarThumb;
}

export function useRoleListModel() {
  const queryClient = useQueryClient();
  const userId = useGlobalContext().userId;
  const diceRolesQuery = useGetUserRolesByTypeQuery(userId ?? -1, 1);
  const normalRolesQuery = useGetUserRolesByTypeQuery(userId ?? -1, 0);

  const baseRoles = useMemo(() => {
    return [
      ...(diceRolesQuery.data ?? []),
      ...(normalRolesQuery.data ?? []),
    ]
      .map(mapUserRoleToRole)
      .filter(role => role.type !== 2);
  }, [diceRolesQuery.data, normalRolesQuery.data]);

  const rolesByAvatarId = useMemo(() => {
    const next = new Map<number, RoleListItem[]>();
    baseRoles.filter(shouldLoadRoleAvatar).forEach((role) => {
      next.set(role.avatarId, [...(next.get(role.avatarId) ?? []), role]);
    });
    return next;
  }, [baseRoles]);

  const avatarQuerySlots = useMemo(
    () => createUniqueQuerySlots([...rolesByAvatarId.keys()], avatarId => String(avatarId)),
    [rolesByAvatarId],
  );

  const avatarQueries = useQueries({
    queries: avatarQuerySlots.queryItems.map(({ item: avatarId }) => ({
      queryKey: ["getRoleAvatar", avatarId],
      queryFn: async () => {
        const response = await tuanchat.avatarController.getRoleAvatar(avatarId);
        if (response.success && response.data) {
          const avatar = response.data;
          rolesByAvatarId.get(avatarId)?.forEach((role) => {
            seedRoleAvatarQueryCaches(queryClient, avatar, role.id);
          });
        }
        return response;
      },
      staleTime: 86400000,
    })),
  });

  const roles = useMemo(() => {
    const avatarQueryByAvatarId = new Map<number, (typeof avatarQueries)[number]>();
    avatarQuerySlots.queryItems.forEach(({ item: avatarId }, index) => {
      avatarQueryByAvatarId.set(avatarId, avatarQueries[index]);
    });

    return baseRoles.map((role) => {
      if (role.avatar || role.avatarThumb || !role.avatarId) {
        return role;
      }
      const avatar = avatarQueryByAvatarId.get(role.avatarId)?.data?.data;
      if (!avatar) {
        return role;
      }
      const avatarUrls = resolveRoleAvatarUrls(avatar);
      const avatarUrl = avatarUrls.avatarUrl || ROLE_DEFAULT_AVATAR_URL;
      const avatarThumb = avatarUrls.avatarThumbUrl || avatarUrl;
      return {
        ...role,
        avatar: avatarUrl,
        avatarThumb,
      };
    });
  }, [avatarQueries, avatarQuerySlots.queryItems, baseRoles]);

  const isRoleListLoading = diceRolesQuery.isLoading || normalRolesQuery.isLoading;
  const isLoading = isRoleListLoading
    || avatarQueries.some(query => query.isLoading);

  return {
    roles,
    isLoading,
    isRoleListLoading,
    diceRolesQuery,
    normalRolesQuery,
  };
}
