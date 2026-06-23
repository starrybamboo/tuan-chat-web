import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultListMessageSessionResponse } from "@tuanchat/openapi-client/models/ApiResultListMessageSessionResponse";
import type { MessageSessionResponse } from "@tuanchat/openapi-client/models/MessageSessionResponse";

export const USER_SESSIONS_QUERY_KEY = ["getUserSessions"] as const;
export const ROOM_SESSION_QUERY_KEY = ["getRoomSession"] as const;

type UserSessionsSnapshot = ApiResultListMessageSessionResponse | undefined;

export function removeRoomSessionFromCache(
  current: UserSessionsSnapshot,
  roomId: number,
): UserSessionsSnapshot {
  if (!current?.data) {
    return current;
  }

  const nextData = current.data.filter(session => session?.roomId !== roomId);
  if (nextData.length === current.data.length) {
    return current;
  }
  return {
    ...current,
    data: nextData,
  };
}

export function upsertRoomSessionInCache(
  current: UserSessionsSnapshot,
  roomId: number,
  session?: MessageSessionResponse,
): UserSessionsSnapshot {
  if (!current?.data) {
    return current;
  }

  const nextSession: MessageSessionResponse = {
    roomId,
    lastReadSyncId: session?.lastReadSyncId ?? 0,
    latestSyncId: session?.latestSyncId ?? session?.lastReadSyncId ?? 0,
    lastMessageContent: session?.lastMessageContent,
    lastMessageTime: session?.lastMessageTime,
  };
  const index = current.data.findIndex(item => item?.roomId === roomId);
  if (index < 0) {
    return {
      ...current,
      data: [...current.data, nextSession],
    };
  }

  const nextData = current.data.slice();
  nextData[index] = {
    ...nextData[index],
    ...nextSession,
  };
  return {
    ...current,
    data: nextData,
  };
}

export function optimisticRemoveRoomSessionQueryCache(
  queryClient: QueryClient,
  roomId: number,
): UserSessionsSnapshot {
  const previous = queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY);
  queryClient.setQueryData<ApiResultListMessageSessionResponse>(
    USER_SESSIONS_QUERY_KEY,
    current => removeRoomSessionFromCache(current, roomId),
  );
  return previous;
}

export function optimisticUpsertRoomSessionQueryCache(
  queryClient: QueryClient,
  roomId: number,
): UserSessionsSnapshot {
  const previous = queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY);
  queryClient.setQueryData<ApiResultListMessageSessionResponse>(
    USER_SESSIONS_QUERY_KEY,
    current => upsertRoomSessionInCache(current, roomId),
  );
  return previous;
}

export function rollbackUserSessionsQueryCache(
  queryClient: QueryClient,
  previous?: UserSessionsSnapshot,
): void {
  if (!previous) {
    return;
  }
  queryClient.setQueryData(USER_SESSIONS_QUERY_KEY, previous);
}

export function reconcileRemovedRoomSessionQueryCache(queryClient: QueryClient, roomId: number): void {
  queryClient.setQueryData<ApiResultListMessageSessionResponse>(
    USER_SESSIONS_QUERY_KEY,
    current => removeRoomSessionFromCache(current, roomId),
  );
}

export function reconcileUpsertedRoomSessionQueryCache(
  queryClient: QueryClient,
  roomId: number,
  session?: MessageSessionResponse,
): void {
  queryClient.setQueryData<ApiResultListMessageSessionResponse>(
    USER_SESSIONS_QUERY_KEY,
    current => upsertRoomSessionInCache(current, roomId, session),
  );
}

export async function invalidateRoomSessionQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: USER_SESSIONS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ROOM_SESSION_QUERY_KEY }),
  ]);
}
