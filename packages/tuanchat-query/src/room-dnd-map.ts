import type { RoomDndMapResponse } from "@tuanchat/openapi-client/models/RoomDndMapResponse";
import type { RoomDndMapTokenResponse } from "@tuanchat/openapi-client/models/RoomDndMapTokenResponse";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "./optimistic-cache";

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
    roomId: map.roomId,
    tokens: (map.tokens ?? [])
      .map(token => normalizeToken(token))
      .filter((token): token is RoomDndMapToken => Boolean(token)),
    updatedAt: map.updatedAt,
  };
}

export function getRoomDndMapImageUrl(
  map: Pick<RoomDndMapSnapshot, "mapFileId"> | null | undefined,
  resolveMediaUrl: (fileId: number, kind: "image" | "other", quality: "high") => string,
) {
  if (!map?.mapFileId) {
    return "";
  }
  return resolveMediaUrl(map.mapFileId, "image", "high");
}

export function applyRoomDndMapUpsert(
  current: RoomDndMapSnapshot | null | undefined,
  roomId: number,
  input: {
    clearTokens?: boolean;
    gridColor?: string;
    gridCols?: number;
    gridRows?: number;
    mapFileId?: number;
  },
): RoomDndMapSnapshot {
  const base = current ?? {
    gridColor: "#808080",
    gridCols: 10,
    gridRows: 10,
    roomId,
    tokens: [],
  };
  return {
    ...base,
    ...(input.gridColor !== undefined ? { gridColor: input.gridColor } : {}),
    ...(input.gridCols !== undefined ? { gridCols: input.gridCols } : {}),
    ...(input.gridRows !== undefined ? { gridRows: input.gridRows } : {}),
    ...(input.mapFileId !== undefined ? { mapFileId: input.mapFileId } : {}),
    roomId,
    tokens: input.clearTokens ? [] : base.tokens,
  };
}

export function applyRoomDndTokenUpsert(
  current: RoomDndMapSnapshot | null | undefined,
  roomId: number,
  token: RoomDndMapToken,
) {
  const map = applyRoomDndMapUpsert(current, roomId, {});
  const index = map.tokens.findIndex(item => item.roleId === token.roleId);
  return {
    ...map,
    tokens: index >= 0
      ? map.tokens.map((item, itemIndex) => itemIndex === index ? token : item)
      : [...map.tokens, token],
  };
}

export function applyRoomDndTokenRemove(
  current: RoomDndMapSnapshot | null | undefined,
  roleId: number,
) {
  return current
    ? { ...current, tokens: current.tokens.filter(token => token.roleId !== roleId) }
    : current;
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
    onMutate: input => beginOptimisticQueryTransaction(queryClient, [
      optimisticQueryPatch<RoomDndMapSnapshot | null>({
        queryKey: roomDndMapQueryKey(roomId),
        update: current => roomId ? applyRoomDndMapUpsert(current, roomId, input) : current,
      }),
    ]),
    onError: (_error, _input, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSuccess: async (data) => {
      queryClient.setQueryData(roomDndMapQueryKey(roomId), data);
    },
    onSettled: invalidate,
  });

  const clearMapMutation = useMutation({
    mutationFn: async () => {
      if (!roomId || roomId <= 0) {
        throw new Error("请先选择一个房间。");
      }
      await client.roomDndMapController.clearRoomMap({ roomId });
    },
    onMutate: () => beginOptimisticQueryTransaction(queryClient, [
      optimisticQueryPatch<RoomDndMapSnapshot | null>({
        queryKey: roomDndMapQueryKey(roomId),
        update: () => null,
      }),
    ]),
    onError: (_error, _input, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: invalidate,
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
    onMutate: input => beginOptimisticQueryTransaction(queryClient, [
      optimisticQueryPatch<RoomDndMapSnapshot | null>({
        queryKey: roomDndMapQueryKey(roomId),
        update: current => roomId ? applyRoomDndTokenUpsert(current, roomId, input) : current,
      }),
    ]),
    onError: (_error, _input, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: invalidate,
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
    onMutate: roleId => beginOptimisticQueryTransaction(queryClient, [
      optimisticQueryPatch<RoomDndMapSnapshot | null>({
        queryKey: roomDndMapQueryKey(roomId),
        update: current => applyRoomDndTokenRemove(current, roleId),
      }),
    ]),
    onError: (_error, _roleId, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: invalidate,
  });

  return {
    clearMapMutation,
    removeTokenMutation,
    upsertMapMutation,
    upsertTokenMutation,
  };
}
