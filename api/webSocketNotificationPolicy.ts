import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultListMessageSessionResponse } from "@tuanchat/openapi-client/models/ApiResultListMessageSessionResponse";

const USER_SESSIONS_QUERY_KEY = ["getUserSessions"] as const;

export function isGroupRoomMessageReminderEnabled(queryClient: QueryClient, roomId: number): boolean {
  if (!Number.isFinite(roomId) || roomId <= 0) {
    return false;
  }

  const sessions = queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY);
  if (!sessions || !Array.isArray(sessions.data)) {
    return true;
  }

  return sessions.data.some(session => session?.roomId === roomId);
}
