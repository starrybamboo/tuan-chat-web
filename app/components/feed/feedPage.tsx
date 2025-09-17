import type { FeedWithStats } from "@/types/feedTypes";
import type { FeedPageRequest, PostListResponse, PostStatsResponse } from "api";
import PostsCard from "@/components/activities/cards/postsCard";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { tuanchat } from "api/instance";
import { useEffect, useMemo, useState } from "react";

export default function FeedPage() {
  const PAGE_SIZE = 10;
  const FETCH_ON_REMAIN = 2;

  const [feedRef, feedEntry] = useIntersectionObserver();
  // 顶部哨兵
  const [topSentinelRef] = useIntersectionObserver();
  const loginUserId = useGlobalContext().userId ?? -1;

  // 不感兴趣的feed
  const [hiddenFeeds, setHiddenFeeds] = useState<number[]>([]);
  // 无限加载接口
  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: ["pageFeed"],
    queryFn: async ({ pageParam }) => {
      return tuanchat.feedController.pageFeed(pageParam as FeedPageRequest);
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.data || lastPage.data.isLast)
        return undefined;
      return { pageSize: PAGE_SIZE, cursor: lastPage.data.cursor };
    },
    initialPageParam: { pageSize: PAGE_SIZE, cursor: undefined as number | undefined },
    refetchOnWindowFocus: false,
  });

  // 将分页数据 flatten，过滤不感兴趣
  const feeds: FeedWithStats<PostListResponse>[] = useMemo(() => {
    return (
      feedInfiniteQuery.data?.pages.flatMap((page) => {
        // page.data?.list 是 FeedWithStatsResponse[] 类型，需要根据type转换为不同类型
        if (page.data?.list) {
          return page.data.list.map((item) => {
            // 根据feed类型进行正确的类型转换
            if (item.type === 2) {
              // type为2时，response是PostListResponse，stats是PostStatsResponse
              const postListResponse = item.response as PostListResponse;
              const postStatsResponse = item.stats as PostStatsResponse;

              // 转换为FeedStats格式
              const feedStats = {
                postId: postStatsResponse.postId ?? -1,
                likeCount: postStatsResponse.likeCount ?? 0,
                commentCount: postStatsResponse.commentCount ?? 0,
                collectionCount: postStatsResponse.collectionCount ?? 0,
                isLiked: postStatsResponse.isLiked ?? false,
                isCollected: postStatsResponse.isCollected ?? false,
              };

              return {
                type: item.type,
                response: postListResponse,
                stats: feedStats,
              };
            }
            else {
              // 其他类型的feed，保持原有逻辑
              return {
                ...item,
                response: item.response as PostListResponse,
                stats: item.stats as FeedWithStats<PostListResponse>["stats"],
              };
            }
          });
        }
        return [];
      }) ?? []
    ).filter(f => !hiddenFeeds.includes(f.stats?.postId ?? -1));
  }, [feedInfiniteQuery.data?.pages, hiddenFeeds]);

  // 无限滚动逻辑
  useEffect(() => {
    if (feedEntry?.isIntersecting && !feedInfiniteQuery.isFetching && feedInfiniteQuery.hasNextPage) {
      void feedInfiniteQuery.fetchNextPage();
    }
  }, [feedEntry?.isIntersecting, feedInfiniteQuery.isFetching, feedInfiniteQuery.hasNextPage, feedInfiniteQuery]);

  // 点击不感兴趣
  const handleDislike = (postId: number) => {
    setHiddenFeeds(prev => [...prev, postId]);
  };

  return (
    <div className="min-h-screen bg-base-200/70 dark:bg-base-200">
      <main className="mx-auto w-full max-w-2xl px-2 sm:px-4 flex flex-col">
        <div ref={topSentinelRef} aria-hidden="true" className="h-px w-full" />
        <header className="sticky top-0 z-20 bg-base-200/70 backdrop-blur border-b border-base-300 px-2 sm:px-4 py-3">
          <h1 className="text-xl font-semibold">社区广场</h1>
        </header>
        <div className="flex flex-col gap-4 py-4">
          {feeds.map((feed, index) => (
            <div
              ref={index === feeds.length - FETCH_ON_REMAIN ? feedRef : null}
              key={feed.stats?.postId}
            >
              {feed.stats?.postId
                ? (
                    <PostsCard
                      data={feed.response}
                      stats={feed.stats}
                      onDislike={() => handleDislike(feed.stats!.postId)}
                      displayType="feed"
                      loginUserId={loginUserId || -1}
                    />
                  )
                : (
                    <div className="text-sm opacity-60">加载失败或数据为空</div>
                  )}
            </div>
          ))}
          {feedInfiniteQuery.isFetchingNextPage && (
            <div className="text-center py-4">
              <span className="loading loading-dots loading-lg text-primary"></span>
            </div>
          )}
          {!feedInfiniteQuery.hasNextPage && feeds.length > 0 && (
            <p className="text-center text-base-content/50 py-4 text-sm">你已经浏览完所有内容啦！</p>
          )}
        </div>
      </main>
    </div>
  );
}
