import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";

import { useQuery } from "@tanstack/react-query";

import { mobileApiClient } from "@/lib/api";

function roleAvatarsQueryKey(roleId: number) {
  return ["roleAvatars", roleId] as const;
}

export function useRoleAvatarsQuery(roleId: number | null | undefined) {
  return useQuery<RoleAvatar[]>({
    queryKey: roleAvatarsQueryKey(roleId!),
    queryFn: async () => {
      const res = await mobileApiClient.avatarController.getRoleAvatars(roleId!);
      return res.data ?? [];
    },
    enabled: typeof roleId === "number" && roleId > 0,
    staleTime: 86_400_000,
  });
}
