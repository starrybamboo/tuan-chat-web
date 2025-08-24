import {useMutation, useQuery, useQueryClient, useInfiniteQuery} from "@tanstack/react-query";
import type {FeedPageRequest} from "../models/FeedPageRequest";
import type {MessageFeedRequest} from "../models/MessageFeedRequest";
import type {MomentFeedRequest} from "../models/MomentFeedRequest";
import {tuanchat} from "../instance";

/**
 * 发布图文/聊天消息Feed
 */
export function usePublishFeedMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: MessageFeedRequest) => tuanchat.feedController.publishFeed(req),
        mutationKey: ['publishFeed'],
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['pageFeed']});
            queryClient.invalidateQueries({queryKey: ['getUserFeedTimeline']});
        }
    });
}

/**
 * 删除图文/聊天消息Feed
 */
export function useDeleteFeedMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (feedId: number) => tuanchat.feedController.deleteFeed(feedId),
        mutationKey: ['deleteFeed'],
        onSuccess: (_, feedId) => {
            queryClient.invalidateQueries({queryKey: ['getFeedById', feedId]});
            queryClient.invalidateQueries({queryKey: ['pageFeed']});
            queryClient.invalidateQueries({queryKey: ['getUserFeedTimeline']});
            queryClient.invalidateQueries({queryKey: ['getFeedStats', feedId]});
        }
    });
}

/**
 * 批量获取图文/聊天消息Feed统计信息
 */
export function useBatchGetFeedStatsMutation() {
    return useMutation({
        mutationFn: (feedIds: Array<number>) => tuanchat.feedController.batchGetFeedStats(feedIds),
        mutationKey: ['batchGetFeedStats']
    });
}

/**
 * 分页查询图文/聊天消息Feed列表（无限滚动）
 */
export function usePageFeedInfiniteQuery(requestBody: FeedPageRequest) {
    return useInfiniteQuery({
        queryKey: ['pageFeed', requestBody],
        queryFn: ({pageParam}: {pageParam: number | undefined}) => {
            const params = {...requestBody, cursor: pageParam};
            return tuanchat.feedController.pageFeed(params);
        },
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (lastPage) => {
            if (lastPage.data?.isLast) {
                return undefined;
            }
            return lastPage.data?.cursor || undefined;
        },
    });
}

/**
 * 分页查询图文/聊天消息Feed列表
 */
export function usePageFeedQuery(requestBody: FeedPageRequest) {
    return useQuery({
        queryKey: ['pageFeed', requestBody],
        queryFn: () => tuanchat.feedController.pageFeed(requestBody),
        staleTime: 30000, // 30秒缓存
        enabled: !!requestBody
    });
}

/**
 * 获取当前用户关注者的动态Feed时间线（无限滚动）
 */
export function useGetFollowingMomentFeedInfiniteQuery(requestBody: FeedPageRequest) {
    return useInfiniteQuery({
        queryKey: ['getFollowingMomentFeed', requestBody],
        queryFn: ({pageParam}: {pageParam: number | undefined}) => {
            const params = {...requestBody, cursor: pageParam};
            return tuanchat.feedController.getFollowingMomentFeed(params);
        },
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (lastPage) => {
            if (lastPage.data?.isLast) {
                return undefined;
            }
            return lastPage.data?.cursor ?? undefined;
        },
    });
}

/**
 * 获取当前用户关注者的动态Feed时间线
 */
export function useGetFollowingMomentFeedQuery(requestBody: FeedPageRequest) {
    return useQuery({
        queryKey: ['getFollowingMomentFeed', requestBody],
        queryFn: () => tuanchat.feedController.getFollowingMomentFeed(requestBody),
        staleTime: 60000, // 1分钟缓存
        enabled: !!requestBody
    });
}

/**
 * 删除一篇动态Feed
 */
export function useDeleteMomentFeedMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (feedId: number) => tuanchat.feedController.deleteMomentFeed(feedId),
        mutationKey: ['deleteMomentFeed'],
        onSuccess: (_, feedId) => {
            queryClient.invalidateQueries({queryKey: ['getFollowingMomentFeed']});
            queryClient.invalidateQueries({queryKey: ['getUserMomentFeed']});
            queryClient.invalidateQueries({queryKey: ['getUserFeedTimeline']});
        }
    });
}

/**
 * 获取特定用户的动态Feed时间线（无限滚动）
 */
export function useGetUserMomentFeedInfiniteQuery(requestBody: FeedPageRequest) {
    return useInfiniteQuery({
        queryKey: ['getUserMomentFeed', requestBody],
        queryFn: ({pageParam}: {pageParam: number | undefined}) => {
            const params = {...requestBody, cursor: pageParam};
            return tuanchat.feedController.getUserMomentFeed(params);
        },
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (lastPage) => {
            if (lastPage.data?.isLast) {
                return undefined;
            }
            return lastPage.data?.cursor || undefined;
        },
    });
}

/**
 * 获取特定用户的动态Feed时间线
 */
export function useGetUserMomentFeedQuery(requestBody: FeedPageRequest) {
    return useQuery({
        queryKey: ['getUserMomentFeed', requestBody],
        queryFn: () => tuanchat.feedController.getUserMomentFeed(requestBody),
        staleTime: 60000, // 1分钟缓存
        enabled: !!requestBody && !!requestBody.userId
    });
}

/**
 * 发布动态Feed
 */
export function usePublishMomentFeedMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: MomentFeedRequest) => tuanchat.feedController.publishMomentFeed(req),
        mutationKey: ['publishMomentFeed'],
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['getFollowingMomentFeed']});
            queryClient.invalidateQueries({queryKey: ['getUserMomentFeed']});
            queryClient.invalidateQueries({queryKey: ['getUserFeedTimeline']});
        }
    });
}

/**
 * 获取用户的用户活动Feed时间线
 */
export function useGetUserFeedTimelineInfiniteQuery(requestBody: FeedPageRequest) {
    return useInfiniteQuery({
        queryKey: ['getUserFeedTimeline', requestBody],
        queryFn: ({pageParam}: {pageParam: number | undefined}) => {
            const params = {...requestBody, cursor: pageParam};
            return tuanchat.feedController.getUserFeedTimeline(params);
        },
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (lastPage) => {
            if (lastPage.data?.isLast) {
                return undefined;
            }
            return lastPage.data?.cursor || undefined;
        },
    });
}

/**
 * 获取用户的用户活动Feed时间线
 */
export function useGetUserFeedTimelineQuery(requestBody: FeedPageRequest) {
    return useQuery({
        queryKey: ['getUserFeedTimeline', requestBody],
        queryFn: () => tuanchat.feedController.getUserFeedTimeline(requestBody),
        staleTime: 60000, // 1分钟缓存
        enabled: !!requestBody && !!requestBody.userId
    });
}

/**
 * 获取图文/聊天消息Feed统计信息
 * @param feedId Feed ID
 */
export function useGetFeedStatsQuery(feedId: number) {
    return useQuery({
        queryKey: ['getFeedStats', feedId],
        queryFn: () => tuanchat.feedController.getFeedStats(feedId),
        staleTime: 30000, // 30秒缓存
        enabled: feedId > 0
    });
}

/**
 * 根据ID获取图文/聊天消息Feed详情
 * @param feedId Feed ID
 */
export function useGetFeedByIdQuery(feedId: number) {
    return useQuery({
        queryKey: ['getFeedById', feedId],
        queryFn: () => tuanchat.feedController.getFeedById(feedId),
        staleTime: 300000, // 5分钟缓存
        enabled: feedId > 0
    });
}