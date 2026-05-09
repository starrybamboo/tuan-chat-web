import { useGetRoomMembersQuery as useSharedGetRoomMembersQuery } from "@tuanchat/query/members";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";

export function useRoomMembersQuery(roomId: number | null) {
  const { isAuthenticated } = useAuthSession();

  return useSharedGetRoomMembersQuery(mobileApiClient, roomId ?? -1, {
    enabled: isAuthenticated && typeof roomId === "number" && roomId > 0,
    staleTime: 300_000,
  });
}
