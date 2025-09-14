import {useMutation, useQuery, useQueryClient, useInfiniteQuery} from "@tanstack/react-query";
import type {FeedPageRequest} from "../models/FeedPageRequest";
import type {MomentFeedRequest} from "../models/MomentFeedRequest";
import {tuanchat} from "../instance";

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
 * 获取当前用户关注者的动态Feed时间线（已废弃，一开始使用的是点一下加载更多这样的）
 */
// export function useGetFollowingMomentFeedQuery(requestBody: FeedPageRequest) {
//     return useQuery({
//         queryKey: ['getFollowingMomentFeed', requestBody],
//         queryFn: () => tuanchat.feedController.getFollowingMomentFeed(requestBody),
//         staleTime: 60000, // 1分钟缓存
//         enabled: !!requestBody
//     });
// }

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
 * 获取特定用户的动态Feed时间线（已废弃，一开始使用的是点一下加载更多这样的）
 */
// export function useGetUserMomentFeedQuery(requestBody: FeedPageRequest) {
//     return useQuery({
//         queryKey: ['getUserMomentFeed', requestBody],
//         queryFn: () => tuanchat.feedController.getUserMomentFeed(requestBody),
//         staleTime: 60000, // 1分钟缓存
//         enabled: !!requestBody && !!requestBody.userId
//     });
// }

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
        }
    });
}

/**
 * 获取动态总体统计信息
 */
export function useGetMomentFeedStatsQuery(userId: number) {
    return useQuery({
        queryKey: ['getMomentFeedStats', userId],
        queryFn: () => tuanchat.feedController.getMomentFeedStats(userId),
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
        queryFn: () => tuanchat.feedController.getMomentById(feedId),
        enabled: enabled && feedId > 0,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000, // 缓存10分钟
    });
}
