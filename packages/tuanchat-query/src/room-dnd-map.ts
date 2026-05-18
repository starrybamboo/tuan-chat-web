import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RoomDndMapResponse } from "@tuanchat/openapi-client/models/RoomDndMapResponse";
import type { RoomDndMapTokenResponse } from "@tuanchat/openapi-client/models/RoomDndMapTokenResponse";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type RoomDndMapClient = Pick<TuanChat, "roomDndMapController">;

export type RoomDndMapToken = {
  colIndex: number;
  roleId: number;
  rowIndex: number;
};

export type RoomDndMapSnapshot = {
  gridColor: string;
  gridCols: number;
  gridRows: number;
  mapFileId?: number;
  mapMediaType?: string;
  roomId: number;
  tokens: RoomDndMapToken[];
  updatedAt?: number;
};

export function roomDndMapQueryKey(roomId: number | null | undefined) {
  return ["roomDndMap", roomId ?? null] as const;
}

function normalizeToken(token: RoomDndMapTokenResponse | null | undefined): RoomDndMapToken | null {
  if (!token || typeof token.roleId !== "number" || token.roleId <= 0) {
    return null;
  }
  return {
    colIndex: token.colIndex ?? 0,
    roleId: token.roleId,
    rowIndex: token.rowIndex ?? 0,
  };
}

export function normalizeRoomDndMap(map: RoomDndMapResponse | null | undefined): RoomDndMapSnapshot | null {
  if (!map || typeof map.roomId !== "number" || map.roomId <= 0) {
    return null;
  }
  return {
    gridColor: map.gridColor ?? "#808080",
    gridCols: map.gridCols ?? 10,
    gridRows: map.gridRows ?? 10,
    mapFileId: map.mapFileId,
    mapMediaType: map.mapMediaType,
    roomId: map.roomId,
    tokens: (map.tokens ?? [])
      .map(token => normalizeToken(token))
      .filter((token): token is RoomDndMapToken => Boolean(token)),
    updatedAt: map.updatedAt,
  };
}

export function getRoomDndMapImageUrl(
  map: Pick<RoomDndMapSnapshot, "mapFileId" | "mapMediaType"> | null | undefined,
  resolveMediaUrl: (fileId: number, kind: "image" | "other", quality: "high") => string,
) {
  if (!map?.mapFileId) {
    return "";
  }
  return resolveMediaUrl(map.mapFileId, map.mapMediaType === "image" ? "image" : "other", "high");
}

export function useRoomDndMapQuery(
  client: RoomDndMapClient,
  roomId: number | null,
  options: { staleTime?: number } = {},
) {
  return useQuery({
    enabled: typeof roomId === "number" && roomId > 0,
    queryFn: async () => {
      if (!roomId || roomId <= 0) {
        return null;
      }
      const response = await client.roomDndMapController.getRoomMap(roomId);
      return normalizeRoomDndMap(response.data);
    },
    queryKey: roomDndMapQueryKey(roomId),
    staleTime: options.staleTime ?? 60_000,
  });
}

export function useRoomDndMapMutations(client: RoomDndMapClient, roomId: number | null) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: roomDndMapQueryKey(roomId) });
  };

  const upsertMapMutation = useMutation({
    mutationFn: async (input: {
      clearTokens?: boolean;
      gridColor?: string;
      gridCols?: number;
      gridRows?: number;
      mapFileId?: number;
    }) => {
      if (!roomId || roomId <= 0) {
        throw new Error("请先选择一个房间。");
      }
      const response = await client.roomDndMapController.upsertRoomMap({
        roomId,
        ...input,
      });
      return normalizeRoomDndMap(response.data);
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(roomDndMapQueryKey(roomId), data);
      await invalidate();
    },
  });

  const clearMapMutation = useMutation({
    mutationFn: async () => {
      if (!roomId || roomId <= 0) {
        throw new Error("请先选择一个房间。");
      }
      await client.roomDndMapController.clearRoomMap({ roomId });
    },
    onSuccess: async () => {
      queryClient.setQueryData(roomDndMapQueryKey(roomId), null);
      await invalidate();
    },
  });

  const upsertTokenMutation = useMutation({
    mutationFn: async (input: { colIndex: number; roleId: number; rowIndex: number }) => {
      if (!roomId || roomId <= 0) {
        throw new Error("请先选择一个房间。");
      }
      await client.roomDndMapController.upsertToken({
        roomId,
        ...input,
      });
    },
    onSuccess: invalidate,
  });

  const removeTokenMutation = useMutation({
    mutationFn: async (roleId: number) => {
      if (!roomId || roomId <= 0) {
        throw new Error("请先选择一个房间。");
      }
      await client.roomDndMapController.removeToken({
        roomId,
        roleId,
      });
    },
    onSuccess: invalidate,
  });

  return {
    clearMapMutation,
    removeTokenMutation,
    upsertMapMutation,
    upsertTokenMutation,
  };
}
