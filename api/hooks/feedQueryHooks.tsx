import { useMutation, useQuery ,useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedWithStats } from "@/types/feedTypes";
import { tuanchat } from "api/instance";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { useEffect, useState,useMemo, useCallback, useRef } from "react";
import type { FeedPageRequest, FeedWithStatsResponse, PostListResponse } from "../index";
import { useDebounceFn } from 'ahooks';

/**
 * 发布图文/聊天消息 Feed
 */
// export function usePublishFeedMutation() {
//     return useMutation({
//         mutationKey: ["publishFeed"],
//         mutationFn: async (feed: MessageFeedRequest) => {
//             return tuanchat.feedController.publishFeed(feed);
//         }
//     });
// }

/**
 * 根据ID获取图文/聊天消息Feed详情
 */
// export function useGetFeedByIdQuery(feedId: number) {
//     return useQuery({
//         queryKey: ["getFeedById", feedId],
//         queryFn: async () => {
//             const res = await tuanchat.feedController.getFeedById(feedId);
//             return res.data;
//         },
//         staleTime: 300 * 1000
//     });
// }

/**
 * 根据ID获取图文/聊天消息Feed的统计数据
 */
// export function useGetFeedStatsByIdQuery(feedId: number) {
//     return useQuery({
//         queryKey: ['feedStats', feedId],
//         queryFn: async () => {
//             const response = await tuanchat.feedController.getFeedStats(feedId);
//             return response.data || null;
//         },
//         enabled: feedId > 0,
//     });
// }

/**
 * 首页Feed无限加载
 */

export function useFeedInfiniteQuery( PAGE_SIZE :number = 10 , MAX_PAGES:number =10){
    return useInfiniteQuery({
        queryKey:['pageFeed',PAGE_SIZE],
        queryFn:({pageParam})=>{
            return tuanchat.feedController.pageFeed(pageParam as FeedPageRequest);
        },
        getNextPageParam:(lastPage)=>{
             if (!lastPage.data || lastPage.data.isLast)
        return undefined;
      return {cursor: lastPage.data.cursor , pageSize:PAGE_SIZE };
        },
        initialPageParam:{cursor: undefined as number| undefined , pageSize:PAGE_SIZE },
        refetchOnWindowFocus:false,
        maxPages:MAX_PAGES
        })

}

/**
 * 无限滚动监听
 */

export function useInfiniteScrollObserver(
  isFetching: boolean,
  hasNextPage: boolean,
  fetchNextPage: () => Promise<unknown>
) {
  const [ref, entry] = useIntersectionObserver();

  // 防抖 fetchNextPage
  const { run: debouncedFetch } = useDebounceFn(() => {
    if (!isFetching && hasNextPage) {
      void fetchNextPage();
    }
  }, { wait: 200 });

  useEffect(() => {
    if (entry?.isIntersecting) {
      debouncedFetch();
    }
  }, [entry?.isIntersecting, debouncedFetch]);

  return ref;
}

/**
 * 获取扁平化Feed
 */
export function useFlattenFeeds(pageData:any){
    const feeds :FeedWithStats<PostListResponse>[] = useMemo(()=>{
        if (!pageData?.pages || !Array.isArray(pageData.pages)) {
            return [];
        }
        return pageData.pages
            .flatMap((page: any) => {
                const items = page?.data?.list ?? [];
                if (!Array.isArray(items)) return [];
                return items as FeedWithStatsResponse[];
            })
            .filter(Boolean);
    }, [pageData?.pages]);

    return feeds;
}

/**
 * 过滤不感兴趣的Feed
 */
export function useFilterFeeds(allFeeds:FeedWithStats<PostListResponse>[],hiddenFeeds:number[]){
    const displayFeeds = useMemo(()=>{
        return allFeeds.filter((feed)=>{
            const postId = feed.stats?.postId;
            if (hiddenFeeds.includes(postId??-1)){
                return false;
            }
            return true;
        })
    },[allFeeds,hiddenFeeds])
    return displayFeeds;
}

/**
 * feed详情预加载
 */

export function useFeedPrefetch() {
  const queryClient = useQueryClient();
  const lastTimeRef = useRef(0);

  const prefetch = useCallback((feed: FeedWithStats<any>) => {
    const now = Date.now();
    if (now - lastTimeRef.current < 1000) return; // 节流 1s
    lastTimeRef.current = now;

    const postId = feed.response?.communityPostId;
    const moduleId = feed.response?.moduleId;

    if (!postId && !moduleId) return;

    if (postId) {
      queryClient.prefetchQuery({
        queryKey: ['getPostDetail', postId],
        queryFn: () => tuanchat.communityPostController.getPostDetail(postId),
        staleTime: 5 * 60 * 1000,
      });
    }

    if (moduleId) {
      queryClient.prefetchQuery({
        queryKey: ['moduleDetail', moduleId],
        queryFn: () => tuanchat.moduleController.getById(moduleId),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [queryClient]);

  return { prefetch };
}


