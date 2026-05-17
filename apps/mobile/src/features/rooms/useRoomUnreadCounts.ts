import { useEffect, useMemo } from "react";

import {
  getMaxRoomMessageSyncId,
  getRoomUnreadCountsFromSessions,
  useUpdateRoomReadPositionMutation,
  useUserMessageSessionsQuery,
} from "@tuanchat/query";

import { mobileApiClient } from "@/lib/api";
import { useAuthSession } from "@/features/auth/auth-session";
import { useRoomMessagesQuery } from "@/features/messages/useRoomMessagesQuery";

export function useRoomUnreadCounts(currentRoomId?: number | null): Record<number, number> {
  const { isAuthenticated } = useAuthSession();
  const sessionsQuery = useUserMessageSessionsQuery(mobileApiClient, { enabled: isAuthenticated });
  const updateReadPositionMutation = useUpdateRoomReadPositionMutation(mobileApiClient);
  const currentRoomMessagesQuery = useRoomMessagesQuery(currentRoomId ?? null);

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
    updateReadPositionMutation.mutate({ roomId: currentRoomId, syncId: targetSyncId });
  }, [
    currentRoomId,
    currentRoomMessagesQuery.messages,
    sessionsQuery.data?.data,
    updateReadPositionMutation,
  ]);

  return unreadCounts;
}
