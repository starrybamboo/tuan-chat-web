import { useQueryClient } from "@tanstack/react-query";
import {
  getMaxRoomMessageSyncId,
  getRoomUnreadCountsFromSessions,
  useUpdateRoomReadPositionMutation,
  useUserMessageSessionsQuery,
} from "@tuanchat/query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { useRoomMessagesQuery } from "@/features/messages/useRoomMessagesQuery";
import { mobileApiClient } from "@/lib/api";

import {
  clearRoomReadPositionSyncTimers,
  markRoomReadOptimistically,
  scheduleDebouncedRoomReadPositionSync,
  shouldAutoMarkFocusedRoomRead,
  type RoomReadPositionSyncState,
} from "./roomReadPositionSync";

export function useRoomUnreadCounts(
  currentRoomId?: number | null,
  options: { isRoomFocused?: boolean } = {},
): Record<number, number> {
  const { isAuthenticated } = useAuthSession();
  const queryClient = useQueryClient();
  const [appState, setAppState] = useState(AppState.currentState);
  const sessionsQuery = useUserMessageSessionsQuery(mobileApiClient, { enabled: isAuthenticated });
  const { mutate: updateReadPosition } = useUpdateRoomReadPositionMutation(mobileApiClient);
  const currentRoomMessagesQuery = useRoomMessagesQuery(currentRoomId ?? null);
  const syncStateRef = useRef<RoomReadPositionSyncState>({
    pendingSyncIdsByRoom: {},
    timersByRoom: {},
  });

  const unreadCounts = useMemo(() => {
    return getRoomUnreadCountsFromSessions(sessionsQuery.data?.data);
  }, [sessionsQuery.data?.data]);

  useEffect(() => {
    const syncState = syncStateRef.current;
    return () => clearRoomReadPositionSyncTimers(syncState);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const latestMessageSyncId = getMaxRoomMessageSyncId(currentRoomMessagesQuery.messages);
    const session = sessionsQuery.data?.data?.find(item => item.roomId === currentRoomId);
    const targetSyncId = Math.max(latestMessageSyncId, session?.latestSyncId ?? 0);
    if (!shouldAutoMarkFocusedRoomRead({
      currentRoomId,
      isRoomFocused: appState === "active" && options.isRoomFocused,
      targetSyncId,
    })) {
      return;
    }
    if (targetSyncId <= (session?.lastReadSyncId ?? 0)) {
      return;
    }
    markRoomReadOptimistically(queryClient, currentRoomId!, targetSyncId);
    scheduleDebouncedRoomReadPositionSync(
      syncStateRef.current,
      currentRoomId!,
      targetSyncId,
      (roomId, syncId) => updateReadPosition({ roomId, syncId }),
    );
  }, [
    currentRoomId,
    currentRoomMessagesQuery.messages,
    appState,
    options.isRoomFocused,
    sessionsQuery.data?.data,
    updateReadPosition,
    queryClient,
  ]);

  return unreadCounts;
}
