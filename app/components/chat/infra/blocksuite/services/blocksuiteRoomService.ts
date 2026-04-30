import type { QueryClient } from "@tanstack/react-query";

import { fetchUserRoomsWithCache } from "@tuanchat/query/spaces";
import { tuanchat } from "api/instance";

export async function listBlocksuiteRoomIdsForSpace(spaceId: number, queryClient?: QueryClient): Promise<Set<number>> {
  if (!Number.isFinite(spaceId) || spaceId <= 0)
    return new Set();

  const response = queryClient
    ? await fetchUserRoomsWithCache(queryClient, tuanchat, spaceId)
    : await tuanchat.roomController.getUserRooms(spaceId);
  const rooms = (response as any)?.data?.rooms ?? [];
  const ids = new Set<number>();

  for (const room of rooms) {
    const id = Number((room as any)?.roomId);
    if (Number.isFinite(id) && id > 0) {
      ids.add(id);
    }
  }

  return ids;
}
