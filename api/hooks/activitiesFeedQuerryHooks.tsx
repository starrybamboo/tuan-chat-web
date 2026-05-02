import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import type {FeedPageRequest} from "@tuanchat/openapi-client/models/FeedPageRequest";
import type { FeedWithStatsResponse } from "@tuanchat/openapi-client/models/FeedWithStatsResponse";
import type {MomentFeedRequest} from "@tuanchat/openapi-client/models/MomentFeedRequest";

type DisabledFeedPageResponse = {
    success: boolean;
    data: {
        list: FeedWithStatsResponse[];
        cursor?: number;
        isLast: boolean;
    };
};

const DISABLED_FEED_PAGE_RESPONSE: DisabledFeedPageResponse = {
    success: true,
    data: {
        list: [],
        cursor: undefined,
        isLast: true,
    },
};

const DISABLED_FEED_STATS_RESPONSE = {
    success: true,
    data: {
        totalMomentFeedCount: 0,
        totalLikeCount: 0,
        totalCommentCount: 0,
    },
};

type DisabledMomentResponse = {
    success: boolean;
    data: FeedWithStatsResponse | null;
};

const DISABLED_MOMENT_RESPONSE: DisabledMomentResponse = {
    success: true,
    data: null,
};

function rejectDisabledFeedModule(): never {
    throw new Error("动态模块已下线");
}

/**
 * 获取当前用户关注者的动态Feed时间线（无限滚动）
 */
export function useGetFollowingMomentFeedInfiniteQuery(requestBody: FeedPageRequest) {
    return useInfiniteQuery({
        queryKey: ['getFollowingMomentFeed', requestBody],
        queryFn: async () => DISABLED_FEED_PAGE_RESPONSE,
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
 * 删除一篇动态Feed
 */
export function useDeleteMomentFeedMutation() {
    return useMutation({
        mutationFn: async (_feedId: number) => rejectDisabledFeedModule(),
        mutationKey: ['deleteMomentFeed'],
    });
}

/**
 * 获取特定用户的动态Feed时间线（无限滚动）
 */
export function useGetUserMomentFeedInfiniteQuery(requestBody: FeedPageRequest) {
    return useInfiniteQuery({
        queryKey: ['getUserMomentFeed', requestBody],
        queryFn: async () => DISABLED_FEED_PAGE_RESPONSE,
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
 * 发布动态Feed
 */
export function usePublishMomentFeedMutation() {
    return useMutation({
        mutationFn: async (_req: MomentFeedRequest) => rejectDisabledFeedModule(),
        mutationKey: ['publishMomentFeed'],
    });
}

/**
 * 获取动态总体统计信息
 */
export function useGetMomentFeedStatsQuery(userId: number) {
    return useQuery({
        queryKey: ['getMomentFeedStats', userId],
        queryFn: async () => DISABLED_FEED_STATS_RESPONSE,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000, // 缓存30分钟
    });
}

/**
 * 根据 feedId 获取动态详情
 */
export function useGetMomentByIdQuery(feedId: number, enabled: boolean = true) {
    return useQuery({
        queryKey: ['getMomentById', feedId],
        queryFn: async () => DISABLED_MOMENT_RESPONSE,
        enabled: enabled && feedId > 0,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000, // 缓存10分钟
    });
}

