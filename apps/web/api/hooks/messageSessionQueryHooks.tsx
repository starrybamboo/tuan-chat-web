import {
    useSubscribeRoomMutation as useSharedSubscribeRoomMutation,
    useUnsubscribeRoomMutation as useSharedUnsubscribeRoomMutation,
    useUpdateRoomReadPositionMutation as useSharedUpdateRoomReadPositionMutation,
    useUserMessageSessionsQuery,
} from "@tuanchat/query/message-sessions";

import {tuanchat} from "../instance";

/**
 * 取消订阅房间
 */
export function useUnsubscribeRoomMutation() {
    return useSharedUnsubscribeRoomMutation(tuanchat);
}

/**
 * 订阅房间
 */
export function useSubscribeRoomMutation() {
    return useSharedSubscribeRoomMutation(tuanchat);
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
    return useUserMessageSessionsQuery(tuanchat, { staleTime: 300_000 });
}
