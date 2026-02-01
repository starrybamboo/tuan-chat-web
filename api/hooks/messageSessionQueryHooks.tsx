import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type {SessionReadUpdateRequest} from "../models/SessionReadUpdateRequest";

/**
 * 鍙栨秷璁㈤槄鎴块棿
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
 * 璁㈤槄鎴块棿
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
 * @param roomId 鎴块棿ID
 */

/**
 * 获取用户的所有会话列?
 */
export function useGetUserSessionsQuery() {
    return useQuery({
        queryKey: ['getUserSessions'],
        queryFn: () => tuanchat.messageSession.getUserSessions(),
        staleTime: 300000 // 5鍒嗛挓缂撳瓨
    });
}
