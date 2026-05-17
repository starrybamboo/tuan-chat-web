import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { mobileApiClient } from "@/lib/api";

export function getRoomExtraQueryKey(roomId: number | null, key: string) {
  return ["roomExtra", roomId, key] as const;
}

/**
 * 读取并写入房间 extra，结构与 Web 端保持一致。
 */
export function useRoomExtra<T>(roomId: number | null, key: string, defaultValue: T) {
  const queryClient = useQueryClient();
  const [localOverride, setLocalOverride] = useState<{
    key: string;
    roomId: number;
    serialized: string;
    value: T;
  } | null>(null);

  const roomExtraQuery = useQuery({
    queryKey: getRoomExtraQueryKey(roomId, key),
    queryFn: async () => {
      if (!roomId || roomId <= 0) {
        return null;
      }
      const response = await mobileApiClient.roomController.getRoomExtra(roomId, key);
      return response.data ?? null;
    },
    enabled: typeof roomId === "number" && roomId > 0,
    staleTime: 60_000,
  });

  const remoteSerialized = roomExtraQuery.data;
  const remoteValue = useMemo(() => {
    if (!remoteSerialized) {
      return defaultValue;
    }

    try {
      return JSON.parse(remoteSerialized) as T;
    }
    catch {
      return defaultValue;
    }
  }, [defaultValue, remoteSerialized]);

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
    await mobileApiClient.roomController.setRoomExtra({
      roomId,
      key,
      value: serialized,
    });
    await queryClient.invalidateQueries({ queryKey: getRoomExtraQueryKey(roomId, key) });
  }, [key, queryClient, roomId]);

  return {
    ...roomExtraQuery,
    setValue,
    value,
  };
}
