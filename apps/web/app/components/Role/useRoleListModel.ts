import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientMetadataBatchQueryKey, loadClientMetadataBatch, seedClientMetadataCaches } from "@tuanchat/query/metadata";
import { useGetUserRolesQuery } from "api/hooks/RoleAndAvatarHooks";
import { useEffect, useMemo } from "react";

import { tuanchat } from "@/../api/instance";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";

import { mapUserRoleToRole, resolveRoleAvatarUrls } from "./roleListData";

type RoleListItem = ReturnType<typeof mapUserRoleToRole>;

function shouldLoadRoleAvatar(role: RoleListItem): boolean {
  return role.avatarId > 0 && !role.avatar && !role.avatarThumb;
}

export function useRoleListModel() {
  const queryClient = useQueryClient();
  const userId = useGlobalContext().userId;
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const diceRoles = useMemo(
    () => (userRolesQuery.data?.data ?? []).filter(role => role.type === 1),
    [userRolesQuery.data?.data],
  );
  const normalRoles = useMemo(
    () => (userRolesQuery.data?.data ?? []).filter(role => role.type === 0),
    [userRolesQuery.data?.data],
  );

  const baseRoles = useMemo(() => {
    return [
      ...diceRoles,
      ...normalRoles,
    ]
      .map(mapUserRoleToRole)
      .filter(role => role.type !== 2);
  }, [diceRoles, normalRoles]);

  const rolesByAvatarId = useMemo(() => {
    const next = new Map<number, RoleListItem[]>();
    baseRoles.filter(shouldLoadRoleAvatar).forEach((role) => {
      next.set(role.avatarId, [...(next.get(role.avatarId) ?? []), role]);
    });
    return next;
  }, [baseRoles]);

  const avatarIds = useMemo(() => [...rolesByAvatarId.keys()], [rolesByAvatarId]);
  const metadataRequest = useMemo(() => ({ avatarIds }), [avatarIds]);
  const avatarQuery = useQuery({
    enabled: avatarIds.length > 0,
    queryKey: clientMetadataBatchQueryKey(metadataRequest, tuanchat),
    queryFn: () => loadClientMetadataBatch(tuanchat, metadataRequest),
    staleTime: 86_400_000,
  });
  useEffect(() => {
    if (avatarQuery.data) {
      seedClientMetadataCaches(queryClient, avatarQuery.data);
    }
  }, [avatarQuery.data, queryClient]);

  const roles = useMemo(() => {
    return baseRoles.map((role) => {
      if (role.avatar || role.avatarThumb || !role.avatarId) {
        return role;
      }
      const avatar = avatarQuery.data?.avatars?.[String(role.avatarId)];
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
  }, [avatarQuery.data?.avatars, baseRoles]);

  const isRoleListLoading = userRolesQuery.isLoading;
  const isLoading = isRoleListLoading
    || avatarQuery.isLoading;

  return {
    roles,
    isLoading,
    isRoleListLoading,
    userRolesQuery,
  };
}
