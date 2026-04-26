import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import { useGetMyUserInfoQuery as useSharedGetMyUserInfoQuery } from "@tuanchat/query/users";

export function useCurrentUserQuery() {
  const { isAuthenticated } = useAuthSession();

  return useSharedGetMyUserInfoQuery(mobileApiClient, { enabled: isAuthenticated });
}
