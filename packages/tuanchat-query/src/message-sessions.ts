import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultListMessageSessionResponse } from "@tuanchat/openapi-client/models/ApiResultListMessageSessionResponse";
import type { MessageSessionResponse } from "@tuanchat/openapi-client/models/MessageSessionResponse";
import type { SessionReadUpdateRequest } from "@tuanchat/openapi-client/models/SessionReadUpdateRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bindCancelablePromiseToSignal } from "./cancelable";

type MessageSessionClient = Pick<TuanChat, "messageSession">;

export function getUserMessageSessionsQueryKey() {
  return ["getUserSessions"] as const;
}

export function getRoomMessageSessionQueryKey(roomId: number) {
  return ["getRoomSession", roomId] as const;
}

export function getRoomUnreadCountsFromSessions(
  sessions: readonly MessageSessionResponse[] | undefined,
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const session of sessions ?? []) {
    const roomId = session.roomId;
    if (typeof roomId !== "number" || roomId <= 0) {
      continue;
    }
    const latestSyncId = session.latestSyncId ?? 0;
    const lastReadSyncId = session.lastReadSyncId ?? 0;
    counts[roomId] = Math.max(0, latestSyncId - lastReadSyncId);
  }
  return counts;
}

export function markRoomSessionReadData(
  data: ApiResultListMessageSessionResponse | undefined,
  roomId: number,
  syncId?: number,
): ApiResultListMessageSessionResponse | undefined {
  if (!data?.data) {
    return data;
  }
  return {
    ...data,
    data: data.data.map((session) => {
      if (session.roomId !== roomId) {
        return session;
      }
      const targetSyncId = syncId ?? session.latestSyncId ?? session.lastReadSyncId ?? 0;
      return {
        ...session,
        lastReadSyncId: Math.max(session.lastReadSyncId ?? 0, targetSyncId),
      };
    }),
  };
}

export function bumpRoomSessionLatestSyncData(
  data: ApiResultListMessageSessionResponse | undefined,
  roomId: number,
  latestSyncId: number,
): ApiResultListMessageSessionResponse | undefined {
  if (!data?.data || latestSyncId <= 0) {
    return data;
  }
  return {
    ...data,
    data: data.data.map((session) => {
      if (session.roomId !== roomId) {
        return session;
      }
      return {
        ...session,
        latestSyncId: Math.max(session.latestSyncId ?? 0, latestSyncId),
      };
    }),
  };
}

export function markRoomSessionReadInCache(
  queryClient: QueryClient,
  roomId: number,
  syncId?: number,
) {
  queryClient.setQueryData<ApiResultListMessageSessionResponse>(
    getUserMessageSessionsQueryKey(),
    current => markRoomSessionReadData(current, roomId, syncId),
  );
}

export function bumpRoomSessionLatestSyncInCache(
  queryClient: QueryClient,
  roomId: number,
  latestSyncId: number,
) {
  queryClient.setQueryData<ApiResultListMessageSessionResponse>(
    getUserMessageSessionsQueryKey(),
    current => bumpRoomSessionLatestSyncData(current, roomId, latestSyncId),
  );
}

export function useUserMessageSessionsQuery(
  client: MessageSessionClient,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryFn: ({ signal }) => bindCancelablePromiseToSignal(client.messageSession.getUserSessions(), signal),
    queryKey: getUserMessageSessionsQueryKey(),
    staleTime: options.staleTime ?? 30_000,
  });
}

export function useUpdateRoomReadPositionMutation(client: MessageSessionClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SessionReadUpdateRequest) => client.messageSession.updateReadPosition1(payload),
    mutationKey: ["updateReadPosition1"],
    onSuccess: (_result, payload) => {
      markRoomSessionReadInCache(queryClient, payload.roomId, payload.syncId);
      queryClient.invalidateQueries({ queryKey: getRoomMessageSessionQueryKey(payload.roomId) });
    },
  });
}

export function useSubscribeRoomMutation(client: MessageSessionClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: number) => client.messageSession.subscribeRoom(roomId),
    mutationKey: ["subscribeRoom"],
    onSuccess: (_result, roomId) => {
      queryClient.invalidateQueries({ queryKey: getUserMessageSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getRoomMessageSessionQueryKey(roomId) });
    },
  });
}

export function useUnsubscribeRoomMutation(client: MessageSessionClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: number) => client.messageSession.unsubscribeRoom(roomId),
    mutationKey: ["unsubscribeRoom"],
    onSuccess: (_result, roomId) => {
      queryClient.invalidateQueries({ queryKey: getUserMessageSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getRoomMessageSessionQueryKey(roomId) });
    },
  });
}
