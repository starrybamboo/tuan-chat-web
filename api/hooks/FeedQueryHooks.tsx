import { useMutation, useQuery } from "@tanstack/react-query";
import type { MessageFeedRequest } from "../models/MessageFeedRequest";
import { tuanchat } from "../instance";
import type { FeedStatsResponse } from '../index'; 

/**
 * 发布图文/聊天消息 Feed
 */
export function usePublishFeedMutation() {
    return useMutation({
        mutationKey: ["publishFeed"],
        mutationFn: async (feed: MessageFeedRequest) => {
            return tuanchat.feedController.publishFeed(feed);
        }
    });
}

/**
 * 根据ID获取图文/聊天消息Feed详情
 */
export function useGetFeedByIdQuery(feedId: number) {
    return useQuery({
        queryKey: ["getFeedById", feedId],
        queryFn: async () => {
            const res = await tuanchat.feedController.getFeedById(feedId);
            return res.data;
        },
        staleTime: 300 * 1000
    });
}

/**
 * 根据ID获取图文/聊天消息Feed的统计数据
 */
export function useGetFeedStatsByIdQuery(feedId: number) {
    return useQuery({
        queryKey: ['feedStats', feedId],
        queryFn: async () => {
            const response = await tuanchat.feedController.getFeedStats(feedId);
            return response.data || null;
        },
        enabled: feedId > 0,
    });
}