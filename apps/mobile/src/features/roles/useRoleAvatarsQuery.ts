import { useRoleAvatarsQuery as useSharedRoleAvatarsQuery } from "@tuanchat/query/roles";

import { mobileApiClient } from "@/lib/api";

export function useRoleAvatarsQuery(roleId: number | null | undefined) {
  return useSharedRoleAvatarsQuery(mobileApiClient, roleId);
}
