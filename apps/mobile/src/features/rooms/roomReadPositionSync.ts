import type { QueryClient } from "@tanstack/react-query";

import { markRoomSessionReadInCache } from "@tuanchat/query";

export const ROOM_READ_POSITION_SYNC_DEBOUNCE_MS = 3_000;

export type RoomReadPositionSyncScheduler = (roomId: number, syncId: number) => void;

export type RoomReadPositionSyncState = {
  pendingSyncIdsByRoom: Record<number, number>;
  timersByRoom: Record<number, ReturnType<typeof setTimeout>>;
};

export function shouldAutoMarkFocusedRoomRead(options: {
  currentRoomId?: number | null;
  isRoomFocused?: boolean;
  targetSyncId: number;
}) {
  return Boolean(
    options.isRoomFocused
    && typeof options.currentRoomId === "number"
    && options.currentRoomId > 0
    && Number.isFinite(options.targetSyncId)
    && options.targetSyncId > 0,
  );
}

export function markRoomReadOptimistically(
  queryClient: QueryClient,
  roomId: number,
  syncId: number,
) {
  markRoomSessionReadInCache(queryClient, roomId, syncId);
}

export function scheduleDebouncedRoomReadPositionSync(
  state: RoomReadPositionSyncState,
  roomId: number,
  syncId: number,
  syncNow: RoomReadPositionSyncScheduler,
  debounceMs = ROOM_READ_POSITION_SYNC_DEBOUNCE_MS,
) {
  if (roomId <= 0 || syncId <= 0) {
    return;
  }

  state.pendingSyncIdsByRoom[roomId] = Math.max(state.pendingSyncIdsByRoom[roomId] ?? 0, syncId);
  const previousTimer = state.timersByRoom[roomId];
  if (previousTimer) {
    clearTimeout(previousTimer);
  }

  state.timersByRoom[roomId] = setTimeout(() => {
    const targetSyncId = state.pendingSyncIdsByRoom[roomId];
    delete state.pendingSyncIdsByRoom[roomId];
    delete state.timersByRoom[roomId];
    if (targetSyncId > 0) {
      syncNow(roomId, targetSyncId);
    }
  }, debounceMs);
}

export function clearRoomReadPositionSyncTimers(state: RoomReadPositionSyncState) {
  for (const timer of Object.values(state.timersByRoom)) {
    clearTimeout(timer);
  }
  state.pendingSyncIdsByRoom = {};
  state.timersByRoom = {};
}
