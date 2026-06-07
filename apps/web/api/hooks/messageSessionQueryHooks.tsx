import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type {SessionReadUpdateRequest} from "@tuanchat/openapi-client/models/SessionReadUpdateRequest";
import type {ApiResultListMessageSessionResponse} from "@tuanchat/openapi-client/models/ApiResultListMessageSessionResponse";
import type {MessageSessionResponse} from "@tuanchat/openapi-client/models/MessageSessionResponse";

const USER_SESSIONS_QUERY_KEY = ["getUserSessions"] as const;

type UserSessionsSnapshot = ApiResultListMessageSessionResponse | undefined;

function removeRoomSessionFromCache(
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

function upsertRoomSessionInCache(
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

/**
 * 取消订阅房间
 */
export function useUnsubscribeRoomMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (roomId: number) => tuanchat.messageSession.unsubscribeRoom(roomId),
        mutationKey: ['unsubscribeRoom'],
        onMutate: (roomId) => {
            const previous = queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY);
            queryClient.setQueryData<ApiResultListMessageSessionResponse>(
                USER_SESSIONS_QUERY_KEY,
                current => removeRoomSessionFromCache(current, roomId),
            );
            return { previous };
        },
        onError: (_error, _roomId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(USER_SESSIONS_QUERY_KEY, context.previous);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_SESSIONS_QUERY_KEY });
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
        onMutate: (roomId) => {
            const previous = queryClient.getQueryData<ApiResultListMessageSessionResponse>(USER_SESSIONS_QUERY_KEY);
            queryClient.setQueryData<ApiResultListMessageSessionResponse>(
                USER_SESSIONS_QUERY_KEY,
                current => upsertRoomSessionInCache(current, roomId),
            );
            return { previous };
        },
        onError: (_error, _roomId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(USER_SESSIONS_QUERY_KEY, context.previous);
            }
        },
        onSuccess: (response, roomId) => {
            queryClient.setQueryData<ApiResultListMessageSessionResponse>(
                USER_SESSIONS_QUERY_KEY,
                current => upsertRoomSessionInCache(current, roomId, response.data),
            );
            queryClient.invalidateQueries({ queryKey: USER_SESSIONS_QUERY_KEY });
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
