import { imageMediumUrl, imageOriginalUrl } from "@/utils/media/mediaUrl";
import { tuanchat } from "api/instance";

export type RoomDndMapToken = {
  roleId: number;
  rowIndex: number;
  colIndex: number;
};

export type RoomDndMapSnapshot = {
  roomId: number;
  mapFileId?: number;
  gridRows: number;
  gridCols: number;
  gridColor: string;
  tokens: RoomDndMapToken[];
  updatedAt?: number;
};

type RoomDndMapChangeOp = "map_upsert" | "map_clear";

export type RoomDndMapChangeEvent = {
  roomId: number;
  op: RoomDndMapChangeOp;
  map?: Partial<Pick<RoomDndMapSnapshot, "mapFileId" | "gridRows" | "gridCols" | "gridColor">>;
  token?: RoomDndMapToken;
  clearTokens?: boolean;
  updatedAt?: number;
};

export type RoomDndMapUpsertPayload = {
  roomId: number;
  mapFileId?: number;
  gridRows?: number;
  gridCols?: number;
  gridColor?: string;
  clearTokens?: boolean;
};

export const roomDndMapQueryKey = (roomId: number) => ["roomDndMap", roomId] as const;

export async function fetchRoomDndMap(roomId: number): Promise<RoomDndMapSnapshot | null> {
  if (!roomId || roomId <= 0) {
    return null;
  }
  try {
    const res = await tuanchat.roomDndMapController.getRoomMap(roomId);
    return (res as any)?.data ?? null;
  }
  catch (err) {
    console.error("[RoomDndMap] fetch failed", err);
    return null;
  }
}

export async function upsertRoomDndMap(payload: RoomDndMapUpsertPayload): Promise<RoomDndMapSnapshot | null> {
  const res = await tuanchat.roomDndMapController.upsertRoomMap(payload);
  return (res as any)?.data ?? null;
}

export function getRoomDndMapImageUrl(map: Pick<RoomDndMapSnapshot, "mapFileId"> | null | undefined) {
  return map?.mapFileId
    ? imageMediumUrl(map.mapFileId)
    : "";
}

export function getRoomDndMapOriginalImageUrl(map: Pick<RoomDndMapSnapshot, "mapFileId"> | null | undefined) {
  return map?.mapFileId
    ? imageOriginalUrl(map.mapFileId)
    : "";
}

export async function clearRoomDndMap(roomId: number): Promise<boolean> {
  await tuanchat.roomDndMapController.clearRoomMap({ roomId });
  return true;
}

export function applyRoomDndMapChange(
  prev: RoomDndMapSnapshot | null | undefined,
  change: RoomDndMapChangeEvent,
): RoomDndMapSnapshot | null {
  if (!change) {
    return prev ?? null;
  }

  if (change.op === "map_clear") {
    return null;
  }

  const current: RoomDndMapSnapshot = prev
    ? { ...prev, tokens: [...(prev.tokens ?? [])] }
    : {
        roomId: change.roomId,
        gridRows: 10,
        gridCols: 10,
        gridColor: "#808080",
        tokens: [],
      };

  if (change.op === "map_upsert") {
    if (change.map?.mapFileId !== undefined) {
      current.mapFileId = change.map.mapFileId;
    }
    if (change.map?.gridRows !== undefined) {
      current.gridRows = change.map.gridRows ?? current.gridRows;
    }
    if (change.map?.gridCols !== undefined) {
      current.gridCols = change.map.gridCols ?? current.gridCols;
    }
    if (change.map?.gridColor !== undefined) {
      current.gridColor = change.map.gridColor ?? current.gridColor;
    }
    if (change.clearTokens) {
      current.tokens = [];
    }
    else {
      current.tokens = (current.tokens ?? []).filter(token => (
        token.rowIndex >= 0
        && token.colIndex >= 0
        && token.rowIndex < current.gridRows
        && token.colIndex < current.gridCols
      ));
    }
    if (change.map?.mapFileId !== undefined && !current.mapFileId) {
      return null;
    }
    if (typeof change.updatedAt === "number") {
      current.updatedAt = change.updatedAt;
    }
    return current;
  }

  return current;
}
