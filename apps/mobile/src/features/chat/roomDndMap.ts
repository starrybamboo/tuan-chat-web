import {
  getRoomDndMapImageUrl as getSharedRoomDndMapImageUrl,
  roomDndMapQueryKey,
  useRoomDndMapMutations as useSharedRoomDndMapMutations,
  useRoomDndMapQuery as useSharedRoomDndMapQuery,
} from "@tuanchat/query/room-dnd-map";
import type {
  RoomDndMapSnapshot,
  RoomDndMapToken,
} from "@tuanchat/query/room-dnd-map";

import { mobileApiClient } from "@/lib/api";
import { mediaFileUrl } from "@/lib/media-url";

export type {
  RoomDndMapSnapshot,
  RoomDndMapToken,
};

export function getRoomDndMapImageUrl(map: Pick<RoomDndMapSnapshot, "mapFileId" | "mapMediaType"> | null | undefined) {
  return getSharedRoomDndMapImageUrl(map, mediaFileUrl);
}

export function useRoomDndMapQuery(roomId: number | null) {
  return useSharedRoomDndMapQuery(mobileApiClient, roomId);
}

export function useRoomDndMapMutations(roomId: number | null) {
  return useSharedRoomDndMapMutations(mobileApiClient, roomId);
}

export { roomDndMapQueryKey };
