import { useGetMyUserInfoQuery as useSharedGetMyUserInfoQuery } from "@tuanchat/query/users";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";

export function useCurrentUserQuery() {
  const { isAuthenticated } = useAuthSession();

  return useSharedGetMyUserInfoQuery(mobileApiClient, { enabled: isAuthenticated });
}
