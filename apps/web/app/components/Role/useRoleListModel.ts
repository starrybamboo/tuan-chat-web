import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { tuanchat } from "@/../api/instance";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { seedRoleAvatarQueryCaches, useGetUserRolesByTypeQuery } from "api/hooks/RoleAndAvatarHooks";

import { mapUserRoleToRole, resolveRoleAvatarUrls } from "./roleListData";

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

  const avatarQueries = useQueries({
    queries: baseRoles.map(role => ({
      queryKey: ["getRoleAvatar", role.avatarId],
      queryFn: async () => {
        const response = await tuanchat.avatarController.getRoleAvatar(role.avatarId);
        if (response.success && response.data) {
          seedRoleAvatarQueryCaches(queryClient, response.data, role.id);
        }
        return response;
      },
      staleTime: 86400000,
      enabled: role.avatarId > 0 && !role.avatar && !role.avatarThumb,
    })),
  });

  const roles = useMemo(() => {
    return baseRoles.map((role, index) => {
      if (role.avatar || role.avatarThumb || !role.avatarId) {
        return role;
      }
      const avatar = avatarQueries[index]?.data?.data;
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
  }, [avatarQueries, baseRoles]);

  const isLoading = diceRolesQuery.isLoading
    || normalRolesQuery.isLoading
    || avatarQueries.some(query => query.isLoading);

  return {
    roles,
    isLoading,
    diceRolesQuery,
    normalRolesQuery,
  };
}
