import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import { useGetSpaceMembersQuery as useSharedGetSpaceMembersQuery } from "@tuanchat/query/members";

export function useSpaceMembersQuery(spaceId: number | null) {
  const { isAuthenticated } = useAuthSession();

  return useSharedGetSpaceMembersQuery(mobileApiClient, spaceId ?? -1, {
    enabled: isAuthenticated && typeof spaceId === "number" && spaceId > 0,
    staleTime: 300_000,
  });
}
