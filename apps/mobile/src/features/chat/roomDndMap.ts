import type {
  RoomDndMapSnapshot,
  RoomDndMapToken,
} from "@tuanchat/query/room-dnd-map";

import {
  getRoomDndMapImageUrl as getSharedRoomDndMapImageUrl,
  roomDndMapQueryKey,
  useRoomDndMapMutations as useSharedRoomDndMapMutations,
  useRoomDndMapQuery as useSharedRoomDndMapQuery,
} from "@tuanchat/query/room-dnd-map";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import { mediaFileUrl } from "@/lib/media-url";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

export type {
  RoomDndMapSnapshot,
  RoomDndMapToken,
};

const ROOM_DND_MAP_SNAPSHOT_TTL_MS = 5 * 60_000;

export function getRoomDndMapImageUrl(map: Pick<RoomDndMapSnapshot, "mapFileId"> | null | undefined) {
  return getSharedRoomDndMapImageUrl(map, mediaFileUrl);
}

export function useRoomDndMapQuery(roomId: number | null) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = isAuthenticated && typeof roomId === "number" && roomId > 0;
  const query = useSharedRoomDndMapQuery(mobileApiClient, roomId);

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(roomDndMapQueryKey(roomId)),
    scope: "room-dnd-map",
    ttlMs: ROOM_DND_MAP_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}

export function useRoomDndMapMutations(roomId: number | null) {
  return useSharedRoomDndMapMutations(mobileApiClient, roomId);
}

export { roomDndMapQueryKey };
