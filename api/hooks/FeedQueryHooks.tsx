import { useMutation, useQuery ,useInfiniteQuery } from "@tanstack/react-query";
import type { FeedWithStats } from "@/types/feedTypes";
import { tuanchat } from "api/instance";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { useEffect, useState,useMemo } from "react";
import type { FeedPageRequest, FeedWithStatsResponse, PostListResponse } from "../index";

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
export function useInfiniteScrollObserver(isFetching:boolean,hasNextPage:boolean,fetchNextPage:()=>Promise<unknown>){
    const [ref , entry] = useIntersectionObserver();
    useEffect(()=>{
        if (entry?.isIntersecting&&!isFetching && hasNextPage){
            void fetchNextPage();
        }}
        ,[entry?.isIntersecting,isFetching,hasNextPage]);
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
