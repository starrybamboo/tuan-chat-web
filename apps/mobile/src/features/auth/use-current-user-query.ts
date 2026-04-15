import { useQuery } from "@tanstack/react-query";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";

export function useCurrentUserQuery() {
  const { isAuthenticated } = useAuthSession();

  return useQuery({
    queryKey: ["auth", "current-user"],
    queryFn: async () => mobileApiClient.userController.getMyUserInfo(),
    enabled: isAuthenticated,
  });
}
