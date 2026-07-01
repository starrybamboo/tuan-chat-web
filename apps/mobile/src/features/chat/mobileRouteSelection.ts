import type { Room } from "@tuanchat/openapi-client/models/Room";

import { getOrderedVisibleClueFolderRooms, partitionClueFolderRooms } from "@tuanchat/domain/clue-folder";

export type MobileRouteSpaceLike = {
  spaceId?: number | null;
};

export type MobileRouteRoomLike = Pick<Room, "extra" | "roomId">;

function getPositiveIds<T>(items: readonly T[], getId: (item: T) => number | null | undefined): number[] {
  return items
    .map(getId)
    .filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0);
}

export function resolveAutoSelectedSpaceId(params: {
  activeSpaces: readonly MobileRouteSpaceLike[];
  hasExplicitTarget: boolean;
  selectedRoomId: number | null;
  selectedSpaceId: number | null;
}): number | null | undefined {
  if (params.hasExplicitTarget || params.selectedRoomId != null) {
    return undefined;
  }

  const spaceIds = getPositiveIds(params.activeSpaces, space => space.spaceId);
  if (spaceIds.length === 0) {
    return params.selectedSpaceId !== null ? null : undefined;
  }

  if (params.selectedSpaceId != null && spaceIds.includes(params.selectedSpaceId)) {
    return undefined;
  }

  return spaceIds[0];
}

export function resolveRoomOnlyTargetSpaceId(params: {
  activeSpaces: readonly MobileRouteSpaceLike[];
  availableRooms: readonly MobileRouteRoomLike[];
  pendingTargetRoomId: number | null;
  pendingTargetSpaceId: number | null;
  selectedSpaceId: number | null;
}): number | null {
  if (params.pendingTargetSpaceId != null) {
    return params.pendingTargetSpaceId;
  }

  if (params.pendingTargetRoomId == null) {
    return null;
  }

  const selectedSpaceHasRoom = params.selectedSpaceId != null
    && params.availableRooms.some(room => room.roomId === params.pendingTargetRoomId);
  if (selectedSpaceHasRoom) {
    return params.selectedSpaceId;
  }

  const singleSpaceId = getPositiveIds(params.activeSpaces, space => space.spaceId);
  return singleSpaceId.length === 1 ? singleSpaceId[0] : null;
}

export function shouldClearStaleRouteRoom(params: {
  availableRooms: readonly MobileRouteRoomLike[];
  hasExplicitTarget: boolean;
  roomsQueryIsPending: boolean;
  selectedRoomId: number | null;
  selectedSpaceId: number | null;
}): boolean {
  if (
    params.hasExplicitTarget
    || !params.selectedSpaceId
    || !params.selectedRoomId
    || params.roomsQueryIsPending
  ) {
    return false;
  }

  const roomIds = getPositiveIds(params.availableRooms, room => room.roomId);
  return !roomIds.includes(params.selectedRoomId);
}

export function getMobileNavigableRooms<TRoom extends MobileRouteRoomLike>(
  rooms: readonly TRoom[],
  currentUserId?: number | null,
): TRoom[] {
  return partitionClueFolderRooms(rooms, currentUserId).mainRooms;
}

export function getMobileVisibleClueRooms<TRoom extends MobileRouteRoomLike>(
  rooms: readonly TRoom[],
  currentUserId?: number | null,
): TRoom[] {
  return getOrderedVisibleClueFolderRooms(rooms, currentUserId);
}
