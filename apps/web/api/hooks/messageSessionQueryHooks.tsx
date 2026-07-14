import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import { useUpdateRoomReadPositionMutation as useSharedUpdateRoomReadPositionMutation } from "@tuanchat/query/message-sessions";
import {tuanchat} from "../instance";
import {
    ROOM_SESSION_QUERY_KEY,
    USER_SESSIONS_QUERY_KEY,
    invalidateRoomSessionQueries,
    optimisticRemoveRoomSessionQueryCache,
    optimisticUpsertRoomSessionQueryCache,
    reconcileRemovedRoomSessionQueryCache,
    reconcileUpsertedRoomSessionQueryCache,
    rollbackUserSessionsQueryCache,
} from "../messageSessionQueryCache";

/**
 * 取消订阅房间
 */
export function useUnsubscribeRoomMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (roomId: number) => tuanchat.messageSession.unsubscribeRoom(roomId),
        mutationKey: ['unsubscribeRoom'],
        onMutate: async (roomId) => {
            const transaction = await optimisticRemoveRoomSessionQueryCache(queryClient, roomId);
            return { transaction };
        },
        onError: (_error, _roomId, context) => {
            rollbackUserSessionsQueryCache(queryClient, context?.transaction);
        },
        onSuccess: (_response, roomId) => {
            reconcileRemovedRoomSessionQueryCache(queryClient, roomId);
        },
        onSettled: () => {
            void invalidateRoomSessionQueries(queryClient);
        }
    });
}

/**
 * 订阅房间
 */
export function useSubscribeRoomMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (roomId: number) => tuanchat.messageSession.subscribeRoom(roomId),
        mutationKey: ['subscribeRoom'],
        onMutate: async (roomId) => {
            const transaction = await optimisticUpsertRoomSessionQueryCache(queryClient, roomId);
            return { transaction };
        },
        onError: (_error, _roomId, context) => {
            rollbackUserSessionsQueryCache(queryClient, context?.transaction);
        },
        onSuccess: (response, roomId) => {
            reconcileUpsertedRoomSessionQueryCache(queryClient, roomId, response.data);
        },
        onSettled: () => {
            void invalidateRoomSessionQueries(queryClient);
        }
    });
}

/**
 * 更新已读位置
 */
export function useUpdateReadPosition1Mutation() {
    return useSharedUpdateRoomReadPositionMutation(tuanchat);
}

/**
 * 获取用户在指定房间的会话信息
 * @param roomId 房间ID
 */

/**
 * 获取用户的所有会话列表
 */
export function useGetUserSessionsQuery() {
    return useQuery({
        queryKey: USER_SESSIONS_QUERY_KEY,
        queryFn: () => tuanchat.messageSession.getUserSessions(),
        staleTime: 300000 // 5分钟缓存
    });
}
