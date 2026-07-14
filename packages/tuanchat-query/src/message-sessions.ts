import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultListMessageSessionResponse } from "@tuanchat/openapi-client/models/ApiResultListMessageSessionResponse";
import type { ApiResultMessageSessionResponse } from "@tuanchat/openapi-client/models/ApiResultMessageSessionResponse";
import type { MessageSessionResponse } from "@tuanchat/openapi-client/models/MessageSessionResponse";
import type { SessionReadUpdateRequest } from "@tuanchat/openapi-client/models/SessionReadUpdateRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bindCancelablePromiseToSignal } from "./cancelable";
import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "./optimistic-cache";

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

export function setRoomSubscriptionData(
  data: ApiResultListMessageSessionResponse | undefined,
  roomId: number,
  subscribed: boolean,
): ApiResultListMessageSessionResponse | undefined {
  if (!data?.data) {
    return data;
  }
  const exists = data.data.some(session => session.roomId === roomId);
  if (subscribed) {
    return exists ? data : { ...data, data: [...data.data, { roomId }] };
  }
  return exists ? { ...data, data: data.data.filter(session => session.roomId !== roomId) } : data;
}

function markSingleRoomSessionReadData(
  data: ApiResultMessageSessionResponse | undefined,
  syncId?: number,
) {
  if (!data?.data) {
    return data;
  }
  const targetSyncId = syncId ?? data.data.latestSyncId ?? data.data.lastReadSyncId ?? 0;
  return {
    ...data,
    data: {
      ...data.data,
      lastReadSyncId: Math.max(data.data.lastReadSyncId ?? 0, targetSyncId),
    },
  };
}

export function beginRoomReadPositionOptimisticMutation(queryClient: QueryClient, payload: SessionReadUpdateRequest) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListMessageSessionResponse>({
      queryKey: getUserMessageSessionsQueryKey(),
      update: current => markRoomSessionReadData(current, payload.roomId, payload.syncId),
    }),
    optimisticQueryPatch<ApiResultMessageSessionResponse>({
      queryKey: getRoomMessageSessionQueryKey(payload.roomId),
      update: current => markSingleRoomSessionReadData(current, payload.syncId),
    }),
  ]);
}

export function beginRoomSubscriptionOptimisticMutation(queryClient: QueryClient, roomId: number, subscribed: boolean) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListMessageSessionResponse>({
      queryKey: getUserMessageSessionsQueryKey(),
      update: current => setRoomSubscriptionData(current, roomId, subscribed),
    }),
  ]);
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
    onMutate: payload => beginRoomReadPositionOptimisticMutation(queryClient, payload),
    onError: (_error, _payload, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: (_result, _error, payload) => Promise.all([
      queryClient.invalidateQueries({ queryKey: getUserMessageSessionsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getRoomMessageSessionQueryKey(payload.roomId) }),
    ]),
  });
}

export function useSubscribeRoomMutation(client: MessageSessionClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: number) => client.messageSession.subscribeRoom(roomId),
    mutationKey: ["subscribeRoom"],
    onMutate: roomId => beginRoomSubscriptionOptimisticMutation(queryClient, roomId, true),
    onError: (_error, _roomId, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: (_result, _error, roomId) => Promise.all([
      queryClient.invalidateQueries({ queryKey: getUserMessageSessionsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getRoomMessageSessionQueryKey(roomId) }),
    ]),
  });
}

export function useUnsubscribeRoomMutation(client: MessageSessionClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: number) => client.messageSession.unsubscribeRoom(roomId),
    mutationKey: ["unsubscribeRoom"],
    onMutate: roomId => beginRoomSubscriptionOptimisticMutation(queryClient, roomId, false),
    onError: (_error, _roomId, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: (_result, _error, roomId) => Promise.all([
      queryClient.invalidateQueries({ queryKey: getUserMessageSessionsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getRoomMessageSessionQueryKey(roomId) }),
    ]),
  });
}
