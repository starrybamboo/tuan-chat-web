import { useGetMyUserInfoQuery as useSharedGetMyUserInfoQuery } from "@tuanchat/query/users";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import { useMobileQuerySnapshot } from "@/lib/use-mobile-query-snapshot";

import { createCurrentUserQuerySnapshotOptions } from "./current-user-query-snapshot";

export function useCurrentUserQuery() {
  const { isAuthenticated, session } = useAuthSession();
  const query = useSharedGetMyUserInfoQuery(mobileApiClient, { enabled: isAuthenticated });

  return useMobileQuerySnapshot(
    query,
    createCurrentUserQuerySnapshotOptions({
      isAuthenticated,
      userId: session?.userId,
    }),
  );
}
