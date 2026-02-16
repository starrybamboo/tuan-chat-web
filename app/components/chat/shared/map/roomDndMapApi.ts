import { tuanchat } from "api/instance";

export type RoomDndMapToken = {
  roleId: number;
  rowIndex: number;
  colIndex: number;
};

export type RoomDndMapSnapshot = {
  roomId: number;
  mapImgUrl: string;
  gridRows: number;
  gridCols: number;
  gridColor: string;
  tokens: RoomDndMapToken[];
  updatedAt?: number;
};

type RoomDndMapChangeOp = "map_upsert" | "map_clear" | "token_upsert" | "token_remove";

export type RoomDndMapChangeEvent = {
  roomId: number;
  op: RoomDndMapChangeOp;
  map?: Partial<Pick<RoomDndMapSnapshot, "mapImgUrl" | "gridRows" | "gridCols" | "gridColor">>;
  token?: RoomDndMapToken;
  clearTokens?: boolean;
  updatedAt?: number;
};

export type RoomDndMapUpsertPayload = {
  roomId: number;
  mapImgUrl?: string;
  gridRows?: number;
  gridCols?: number;
  gridColor?: string;
  clearTokens?: boolean;
};

export type RoomDndMapTokenUpsertPayload = {
  roomId: number;
  roleId: number;
  rowIndex: number;
  colIndex: number;
};

export type RoomDndMapTokenRemovePayload = {
  roomId: number;
  roleId: number;
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

export async function clearRoomDndMap(roomId: number): Promise<boolean> {
  await tuanchat.roomDndMapController.clearRoomMap({ roomId });
  return true;
}

export async function upsertRoomDndMapToken(payload: RoomDndMapTokenUpsertPayload): Promise<RoomDndMapToken | null> {
  const res = await tuanchat.roomDndMapController.upsertToken(payload);
  return (res as any)?.data ?? null;
}

export async function removeRoomDndMapToken(payload: RoomDndMapTokenRemovePayload): Promise<boolean> {
  await tuanchat.roomDndMapController.removeToken(payload);
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
        mapImgUrl: "",
        gridRows: 10,
        gridCols: 10,
        gridColor: "#808080",
        tokens: [],
      };

  if (change.op === "map_upsert") {
    if (change.map?.mapImgUrl !== undefined) {
      current.mapImgUrl = change.map.mapImgUrl ?? "";
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
    if (change.map?.mapImgUrl !== undefined && !current.mapImgUrl) {
      return null;
    }
    if (typeof change.updatedAt === "number") {
      current.updatedAt = change.updatedAt;
    }
    return current;
  }

  if (change.op === "token_upsert" && change.token) {
    const nextTokens = current.tokens ?? [];
    const idx = nextTokens.findIndex(token => token.roleId === change.token?.roleId);
    if (idx >= 0) {
      nextTokens[idx] = { ...nextTokens[idx], ...change.token };
    }
    else {
      nextTokens.push(change.token);
    }
    current.tokens = nextTokens;
    if (typeof change.updatedAt === "number") {
      current.updatedAt = change.updatedAt;
    }
    return current;
  }

  if (change.op === "token_remove" && change.token) {
    current.tokens = (current.tokens ?? []).filter(token => token.roleId !== change.token?.roleId);
    if (typeof change.updatedAt === "number") {
      current.updatedAt = change.updatedAt;
    }
    return current;
  }

  return current;
}
