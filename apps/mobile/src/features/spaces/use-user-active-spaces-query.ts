import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import { useGetUserActiveSpacesQuery as useSharedGetUserActiveSpacesQuery } from "@tuanchat/query/spaces";

export function useUserActiveSpacesQuery() {
  const { isAuthenticated } = useAuthSession();

  return useSharedGetUserActiveSpacesQuery(mobileApiClient, {
    enabled: isAuthenticated,
    staleTime: 300_000,
  });
}
