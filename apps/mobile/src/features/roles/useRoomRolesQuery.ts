import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useRoomRolesQuery as useSharedRoomRolesQuery } from "@tuanchat/query/room-roles";

import { mobileApiClient } from "@/lib/api";

export function useRoomRolesQuery(roomId: number | null) {
  const query = useSharedRoomRolesQuery(mobileApiClient, roomId, {
    enabled: typeof roomId === "number" && roomId > 0,
  });

  return {
    ...query,
    data: (query.data?.allRoles ?? []) as UserRole[],
  };
}
