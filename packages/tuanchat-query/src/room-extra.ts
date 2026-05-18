import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type RoomExtraClient = Pick<TuanChat, "roomController">;

export function getRoomExtraQueryKey(roomId: number | null | undefined, key: string) {
  return ["roomExtra", roomId ?? null, key] as const;
}

export function parseRoomExtraValue<T>(serialized: string | null | undefined, defaultValue: T): T {
  if (!serialized) {
    return defaultValue;
  }

  try {
    return JSON.parse(serialized) as T;
  }
  catch {
    return defaultValue;
  }
}

export function useRoomExtra<T>(
  client: RoomExtraClient,
  roomId: number | null,
  key: string,
  defaultValue: T,
  options: { staleTime?: number } = {},
) {
  const queryClient = useQueryClient();
  const [localOverride, setLocalOverride] = useState<{
    key: string;
    roomId: number;
    serialized: string;
    value: T;
  } | null>(null);

  const roomExtraQuery = useQuery({
    enabled: typeof roomId === "number" && roomId > 0,
    queryFn: async () => {
      if (!roomId || roomId <= 0) {
        return null;
      }
      const response = await client.roomController.getRoomExtra(roomId, key);
      return response.data ?? null;
    },
    queryKey: getRoomExtraQueryKey(roomId, key),
    staleTime: options.staleTime ?? 60_000,
  });

  const remoteSerialized = roomExtraQuery.data;
  const remoteValue = useMemo(
    () => parseRoomExtraValue(remoteSerialized, defaultValue),
    [defaultValue, remoteSerialized],
  );

  const value = localOverride
    && localOverride.roomId === roomId
    && localOverride.key === key
    && localOverride.serialized !== remoteSerialized
    ? localOverride.value
    : remoteValue;

  const setValue = useCallback(async (newValue: T) => {
    if (!roomId || roomId <= 0) {
      throw new Error("请先选择一个房间。");
    }

    const serialized = JSON.stringify(newValue);
    setLocalOverride({
      roomId,
      key,
      serialized,
      value: newValue,
    });
    queryClient.setQueryData(getRoomExtraQueryKey(roomId, key), serialized);
    await client.roomController.setRoomExtra({
      roomId,
      key,
      value: serialized,
    });
    await queryClient.invalidateQueries({ queryKey: getRoomExtraQueryKey(roomId, key) });
  }, [client, key, queryClient, roomId]);

  return {
    ...roomExtraQuery,
    setValue,
    value,
  };
}
