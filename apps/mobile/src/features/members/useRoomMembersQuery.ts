import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getRoomMembersQueryKey,
  useGetRoomMembersQuery as useSharedGetRoomMembersQuery,
} from "@tuanchat/query/members";

const ROOM_MEMBERS_SNAPSHOT_TTL_MS = 5 * 60_000;

export function useRoomMembersQuery(roomId: number | null) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof roomId === "number" && roomId > 0;
  const query = useSharedGetRoomMembersQuery(mobileApiClient, roomId ?? -1, {
    enabled,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getRoomMembersQueryKey(roomId ?? -1)),
    scope: "room-members",
    ttlMs: ROOM_MEMBERS_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}
