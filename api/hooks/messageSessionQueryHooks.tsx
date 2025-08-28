import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type {SessionReadUpdateRequest} from "../models/SessionReadUpdateRequest";

/**
 * 取消订阅房间
 */
export function useUnsubscribeRoomMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (roomId: number) => tuanchat.messageSession.unsubscribeRoom(roomId),
        mutationKey: ['unsubscribeRoom'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserSessions'] });
            queryClient.invalidateQueries({ queryKey: ['getRoomSession'] });
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserSessions'] });
            queryClient.invalidateQueries({ queryKey: ['getRoomSession'] });
        }
    });
}

/**
 * 更新已读位置
 */
export function useUpdateReadPosition1Mutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SessionReadUpdateRequest) => tuanchat.messageSession.updateReadPosition1(req),
        mutationKey: ['updateReadPosition1'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getRoomSession', variables.roomId] });
            // queryClient.invalidateQueries({ queryKey: ['getUserSessions'] });
        }
    });
}

/**
 * 获取用户在指定房间的会话信息
 * @param roomId 房间ID
 */
export function useGetRoomSessionQuery(roomId: number) {
    return useQuery({
        queryKey: ['getRoomSession', roomId],
        queryFn: () => tuanchat.messageSession.getRoomSession(roomId),
        staleTime: 1800000, // 30分钟缓存
        enabled: roomId > 0
    });
}

/**
 * 获取用户的所有会话列表
 */
export function useGetUserSessionsQuery() {
    return useQuery({
        queryKey: ['getUserSessions'],
        queryFn: () => tuanchat.messageSession.getUserSessions(),
        staleTime: 300000 // 5分钟缓存
    });
}
