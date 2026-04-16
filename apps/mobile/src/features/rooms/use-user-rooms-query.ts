import { useGetUserRoomsQuery as useSharedGetUserRoomsQuery } from "@tuanchat/query/spaces";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";

export function useUserRoomsQuery(spaceId: number | null) {
  const { isAuthenticated } = useAuthSession();

  return useSharedGetUserRoomsQuery(mobileApiClient, spaceId ?? -1, {
    enabled: isAuthenticated && typeof spaceId === "number" && spaceId > 0,
    staleTime: 300_000,
  });
}
