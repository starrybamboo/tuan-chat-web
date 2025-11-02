import type { FeedWithStats } from "@/types/feedTypes";
import type { PostListResponse } from "api";
import PostsCard from "@/components/common/acticityAndFeedPostsCard/postsCard";
import { useState } from "react";
import { useFeedInfiniteQuery, useFilterFeeds, useFlattenFeeds, useInfiniteScrollObserver } from "../../../api/hooks/FeedQueryHooks";

export default function FeedPage() {
  // 相关常量
  const PAGE_SIZE = 10;
  const MAX_PAGES = 10;
  const FETCH_ON_REMAIN = 2;

  // 无限加载接口
  const feedInfiniteQuery = useFeedInfiniteQuery(PAGE_SIZE, MAX_PAGES);
  const { isFetching, hasNextPage, fetchNextPage } = feedInfiniteQuery;
  const feedRef = useInfiniteScrollObserver(isFetching, hasNextPage, fetchNextPage);

  // 不感兴趣的feed
  const [hiddenFeeds, setHiddenFeeds] = useState<number[]>([]);

  // 将分页数据 flatten
  const feeds: FeedWithStats<PostListResponse>[] = useFlattenFeeds(feedInfiniteQuery.data);
  const displayFeeds: FeedWithStats<PostListResponse>[] = useFilterFeeds(feeds, hiddenFeeds);

  // 点击不感兴趣
  const handleDislike = (postId: number) => {
    setHiddenFeeds(prev => [...prev, postId]);
  };

  return (
    <div className="min-h-screen bg-base-200/70 dark:bg-base-200">
      <main className="mx-auto w-full max-w-2xl px-2 sm:px-4 flex flex-col">
        <div aria-hidden="true" className="h-px w-full" />
        <header className="sticky top-0 z-20 bg-base-200/70 backdrop-blur border-b border-base-300 px-2 sm:px-4 py-3">
          <h1 className="text-xl font-semibold">社区广场</h1>
        </header>
        <div className="flex flex-col gap-4 py-4">
          {displayFeeds.map((feed, index) => (
            <div
              ref={index === displayFeeds.length - FETCH_ON_REMAIN ? feedRef : null}
              key={feed.stats?.postId ?? `feed-${index}`}
            >
              {feed.stats
                ? (
                    <PostsCard
                      res={feed?.response}
                      stats={feed.stats}
                      onDislike={() => handleDislike(feed.stats!.postId)}
                      displayType="feed"
                      contentTypeNumber={feed?.type}
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
