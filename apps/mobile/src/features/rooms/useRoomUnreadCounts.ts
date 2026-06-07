import { useQueryClient } from "@tanstack/react-query";
import {
  getMaxRoomMessageSyncId,
  getRoomUnreadCountsFromSessions,
  getUserMessageSessionsQueryKey,
  markRoomSessionReadInCache,
  useUpdateRoomReadPositionMutation,
  useUserMessageSessionsQuery,
} from "@tuanchat/query";
import { useEffect, useMemo, useRef } from "react";

import { useAuthSession } from "@/features/auth/auth-session";
import { useRoomMessagesQuery } from "@/features/messages/useRoomMessagesQuery";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

const MESSAGE_SESSIONS_SNAPSHOT_TTL_MS = 2 * 60_000;

export function useRoomUnreadCounts(currentRoomId?: number | null): Record<number, number> {
  const { isAuthenticated, session } = useAuthSession();
  const queryClient = useQueryClient();
  const rawSessionsQuery = useUserMessageSessionsQuery(mobileApiClient, { enabled: isAuthenticated });
  const sessionsQuery = useMobileQuerySnapshot(rawSessionsQuery, {
    enabled: canUseMobileUserScopedSnapshot({
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getUserMessageSessionsQueryKey()),
    scope: "message-sessions",
    ttlMs: MESSAGE_SESSIONS_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
  const { mutate: updateReadPosition } = useUpdateRoomReadPositionMutation(mobileApiClient);
  const currentRoomMessagesQuery = useRoomMessagesQuery(currentRoomId ?? null);
  const lastSentSyncIdRef = useRef<Record<number, number>>({});

  const unreadCounts = useMemo(() => {
    return getRoomUnreadCountsFromSessions(sessionsQuery.data?.data);
  }, [sessionsQuery.data?.data]);

  useEffect(() => {
    if (!currentRoomId || currentRoomId <= 0) {
      return;
    }
    const latestMessageSyncId = getMaxRoomMessageSyncId(currentRoomMessagesQuery.messages);
    const session = sessionsQuery.data?.data?.find(item => item.roomId === currentRoomId);
    const targetSyncId = Math.max(latestMessageSyncId, session?.latestSyncId ?? 0);
    if (targetSyncId <= 0 || targetSyncId <= (session?.lastReadSyncId ?? 0)) {
      return;
    }
    if (lastSentSyncIdRef.current[currentRoomId] === targetSyncId) {
      return;
    }
    lastSentSyncIdRef.current[currentRoomId] = targetSyncId;
    markRoomSessionReadInCache(queryClient, currentRoomId, targetSyncId);
    updateReadPosition({ roomId: currentRoomId, syncId: targetSyncId });
  }, [
    currentRoomId,
    currentRoomMessagesQuery.messages,
    sessionsQuery.data?.data,
    updateReadPosition,
    queryClient,
  ]);

  return unreadCounts;
}
