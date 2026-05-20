import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";
import {
  getRoomExtraQueryKey,
  parseRoomExtraValue,
  useRoomExtra as useSharedRoomExtra,
} from "@tuanchat/query/room-extra";

const ROOM_EXTRA_SNAPSHOT_TTL_MS = 5 * 60_000;

/**
 * 读取并写入房间 extra，结构与 Web 端保持一致。
 */
export function useRoomExtra<T>(roomId: number | null, key: string, defaultValue: T) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof roomId === "number" && roomId > 0;
  const query = useSharedRoomExtra(mobileApiClient, roomId, key, defaultValue);
  const snapshotQuery = useMobileQuerySnapshot<string | null, typeof query & { data?: string | null }>(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getRoomExtraQueryKey(roomId, key)),
    scope: "room-extra",
    ttlMs: ROOM_EXTRA_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });

  return {
    ...snapshotQuery,
    setValue: query.setValue,
    value: snapshotQuery.data === query.data ? query.value : parseRoomExtraValue(snapshotQuery.data, defaultValue),
  };
}

export { getRoomExtraQueryKey };
