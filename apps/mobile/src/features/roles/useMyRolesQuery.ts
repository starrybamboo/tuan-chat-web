import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useUserRolesByTypesQuery } from "@tuanchat/query/room-roles";

import { mobileApiClient } from "@/lib/api";

export function useMyRolesQuery(userId: number | null) {
  return useUserRolesByTypesQuery(mobileApiClient, userId, [0, 1], {
    enabled: typeof userId === "number" && userId > 0,
    staleTime: 60_000,
  }) as ReturnType<typeof useUserRolesByTypesQuery> & { data?: UserRole[] };
}
